import * as Node from "./Node.js";
import { presets, findPresetBySlug } from "./Presets.js";

const nodeDatabase = [];

let cursorWireConnection = null;
let cursorWireDirectionOnNodeSide = null;

let draggingSelection = false;
let selectionWasDragged = false;
let dragInitiationTarget;

let panningSelection = false;
let awaitingGraphViewUpdate = false;

let graphOffsetX = 0;
let graphOffsetY = 0;
let graphScale = 1;

const storageKey = "save_document";
const presetSlugStorageKey = "save_preset_slug";
const defaultPresetSlug = "new-graph";

export default function NodeGraph() {
	setupEvents();
	setupPresetDropdown();
	setupAddNodeButtons();

	// A preset slug in the URL hash overrides anything currently in localStorage
	const hashSlug = window.location.hash.slice(1);
	const presetFromHash = hashSlug && findPresetBySlug(hashSlug);

	if (presetFromHash) {
		applyPreset(presetFromHash);
		// Strip the hash from the URL after consuming it so refresh falls back to localStorage
		history.replaceState(null, "", window.location.pathname + window.location.search);
	}
	else {
		const previousDocument = localStorage.getItem(storageKey);
		if (previousDocument) {
			loadGraph(JSON.parse(previousDocument));
			const savedSlug = localStorage.getItem(presetSlugStorageKey);
			if (savedSlug && findPresetBySlug(savedSlug)) setPresetDropdownSelection(savedSlug);
			else refreshPresetDropdownLabels();
		}
		else {
			applyPreset(findPresetBySlug(defaultPresetSlug));
		}
	}

	updateGraphView();
}

function applyPreset(preset) {
	if (!preset) return;

	clearGraph();
	loadGraph(preset.data);
	// A freshly loaded preset is unmodified, so wipe any prior edits from localStorage
	localStorage.removeItem(storageKey);
	localStorage.setItem(presetSlugStorageKey, preset.slug);
	setPresetDropdownSelection(preset.slug);
	updateGraphView();
}

function clearGraph() {
	// Copy the array since removeNode mutates nodeDatabase
	const allNodes = nodeDatabase.slice();
	allNodes.forEach((nodeData) => removeNode(nodeData));
}

const dirtyValueSuffix = "__dirty";

function setupPresetDropdown() {
	const dropdown = document.querySelector(".preset-dropdown");
	if (!dropdown) return;

	// Each preset has two options: a visible "clean" one (always in the list) and a hidden
	// "dirty" one that's only selected when localStorage holds edits. Showing the dirty
	// option as selected (asterisk) while keeping the clean option pickable makes re-picking
	// the same preset a real value transition, so `change` fires normally.
	presets.forEach((preset) => {
		const cleanOption = document.createElement("option");
		cleanOption.value = preset.slug;
		cleanOption.textContent = preset.name;
		dropdown.appendChild(cleanOption);

		const dirtyOption = document.createElement("option");
		dirtyOption.value = preset.slug + dirtyValueSuffix;
		dirtyOption.textContent = `${preset.name} *`;
		dirtyOption.hidden = true;
		dropdown.appendChild(dirtyOption);
	});

	dropdown.addEventListener("change", (event) => {
		const slug = baseSlugFromOptionValue(event.target.value);
		const preset = findPresetBySlug(slug);
		if (preset) applyPreset(preset);
	});
}

function baseSlugFromOptionValue(value) {
	return value.endsWith(dirtyValueSuffix) ? value.slice(0, -dirtyValueSuffix.length) : value;
}

function setupAddNodeButtons() {
	document.querySelectorAll(".add-node-button[data-node-name]").forEach((button) => {
		button.addEventListener("click", () => {
			addNode(button.dataset.nodeName);
			saveGraph();
		});
	});
}

function setPresetDropdownSelection(slug) {
	const dropdown = document.querySelector(".preset-dropdown");
	if (!dropdown) return;
	dropdown.value = slug;
	refreshPresetDropdownLabels();
}

// Switch between the clean and dirty options for the currently-selected preset depending on
// whether localStorage holds user edits.
function refreshPresetDropdownLabels() {
	const dropdown = document.querySelector(".preset-dropdown");
	if (!dropdown) return;

	const baseSlug = baseSlugFromOptionValue(dropdown.value);
	if (!findPresetBySlug(baseSlug)) return;

	const edited = localStorage.getItem(storageKey) !== null;
	dropdown.value = edited ? baseSlug + dirtyValueSuffix : baseSlug;
}

export function saveGraph() {
	const nodes = [];
	const connections = [];
	nodeDatabase.reverse().forEach((node, nodeIndex) => {
		const rowData = Object.entries(node.rowData)
			.filter((val) => (val[1]["inputValue"]) !== undefined)
			.map(([identifier, { inputValue }]) => {
				const boundIdentifier = Node.getBoundIdentifier(node, identifier);
				return { identifier: boundIdentifier, inputValue: Node.getOutPropertyValue(node, boundIdentifier) };
			});
		nodes.push({ name: node.name, x: node.x, y: node.y, rowData });
		Object
			.entries(node.inConnections)
			.forEach(([outIdentifier, inConnections]) => {
				inConnections.forEach((inConnection) => {
					connections.push({
						outNodeIndex: nodeIndex,
						outIdentifier,
						inNodeIndex: nodeDatabase.indexOf(inConnection.node),
						inIdentifier: inConnection.identifier
					});
				})
			});
	});

	const data = { nodes, connections };
	localStorage[storageKey] = JSON.stringify(data);
	refreshPresetDropdownLabels();
}

function loadGraph(graph) {
	const { nodes, connections } = graph;

	Node.setComputeSuspended(true);

	const spawnedNodes = nodes.map((nodeData) => {
		const node = addNode(nodeData.name, nodeData.x, nodeData.y);
		nodeData.rowData.forEach(({ identifier, inputValue }) => {
			Node.setFinalPropertyValueAndPropagate(node, identifier, inputValue);
		});
		return node;
	});

	connections.forEach(({ inNodeIndex, inIdentifier, outNodeIndex, outIdentifier }) => {
		connectWire(spawnedNodes[inNodeIndex], inIdentifier, spawnedNodes[outNodeIndex], outIdentifier);
	});

	Node.setComputeSuspended(false);

	recomputeInTopologicalOrder(spawnedNodes);
}

// Kahn's algorithm: process roots first, then anything whose remaining upstream deps are now done.
// Each node's `compute()` runs exactly once, in an order where its inputs are guaranteed to be ready.
function recomputeInTopologicalOrder(nodes) {
	const inDegree = new Map();
	nodes.forEach((node) => {
		let count = 0;
		Object.values(node.inConnections).forEach((wires) => { count += wires.length; });
		inDegree.set(node, count);
	});

	const ready = nodes.filter((node) => inDegree.get(node) === 0);

	while (ready.length > 0) {
		const current = ready.shift();
		Node.recomputeProperties(current);

		Object.values(current.outConnections).forEach((wires) => {
			wires.forEach((connection) => {
				const downstream = connection.node;
				if (!inDegree.has(downstream)) return;
				const remaining = inDegree.get(downstream) - 1;
				inDegree.set(downstream, remaining);
				if (remaining === 0) ready.push(downstream);
			});
		});
	}
}

function setupEvents() {
	// const nodeGraph = document.querySelector(".node-graph");
	const nodeGraph = document.body;
	nodeGraph.addEventListener("mousedown", graphMousedownHandler);
	nodeGraph.addEventListener("mousemove", graphMousemoveHandler);
	nodeGraph.addEventListener("mouseup", graphMouseupHandler);
	nodeGraph.addEventListener("click", graphClickHandler);
	nodeGraph.addEventListener("wheel", graphWheelHandler, { passive: false });
	nodeGraph.addEventListener("keydown", graphKeydownHandler);
}

function graphMousedownHandler(event) {
	// Ignore clicks on toolbar controls so they don't deselect nodes or initiate a pan
	if (event.target.closest(".toolbar")) return;

	const target = event.target;
	dragInitiationTarget = target;

	// Left mouse button
	if (event.button === 0) {
		// No nodes selected (clear selection)
		if (!target.closest("section")) {
			deselectAllNodes();
			// Begin a pan on LMB click on empty area
			panningSelection = true;
			return;
		}

		// Connector dot selected
		if (target.closest("div.connector")) {
			const connector = target.closest("div.connector");
			const mousePosition = [event.clientX, event.clientY];
			const identifier = connector.dataset["identifier"];
			const nodeElement = connector.closest("section");
			const nodeData = nodeDatabase.find(node => node.element === nodeElement);
			const connectorInput = nodeData.inConnections[identifier];

			let targetPath;
			let targetNode = nodeData;
			let targetIdentifier = identifier;
			cursorWireDirectionOnNodeSide = connector.dataset["direction"];
			// Creating a new connection from output to mouse
			if (cursorWireDirectionOnNodeSide === "out") {
				targetPath = createWirePath(connector, mousePosition);
			}
			// Creating a new connection from mouse to input
			else if (cursorWireDirectionOnNodeSide === "in" && connectorInput.length == 0) {
				targetPath = createWirePath(mousePosition, connector);
			}
			// Moving an existing connection
			else if (cursorWireDirectionOnNodeSide === "in" && connectorInput.length > 0) {
				const sourceSide = connectorInput[0];
				disconnectWire(sourceSide.node, sourceSide.identifier, nodeData, identifier);
				saveGraph();

				const connectorElement = sourceSide.node.element.querySelector(`.connector[data-identifier="${sourceSide.identifier}"]`);
				cursorWireDirectionOnNodeSide = "out";
				targetNode = sourceSide.node;
				targetIdentifier = sourceSide.identifier;
				targetPath = createWirePath(connectorElement, mousePosition);
			}

			cursorWireConnection = { node: null, identifier: null, wire: null };
			cursorWireConnection.node = targetNode;
			cursorWireConnection.identifier = targetIdentifier;
			cursorWireConnection.wire = targetPath;

			return;
		}

		if (target.closest("select")) {
			return;
		}

		if (target.closest("input")) {
			// Prevent input selection until click handler
			if (target !== document.activeElement) event.preventDefault();
			event.stopPropagation();
			return;
		}

		// Node selected
		if (target.closest("section")) {
			const nodeElement = target.closest("section");
			const nodeData = nodeDatabase.find(node => node.element === nodeElement);

			if (nodeData.selected) {
				if (event.shiftKey || event.ctrlKey) {
					deselectNode(nodeData);

					// Prevent shift-selection from highlighting text
					event.preventDefault();
				}
				else {
					draggingSelection = true;
				}
			}
			else {
				// Add to current selection
				if (event.shiftKey || event.ctrlKey) {
					selectNode(nodeData, true);
					draggingSelection = true;

					// Prevent shift-selection from highlighting text
					event.preventDefault();
				}
				// Replace current selection
				else {
					deselectAllNodes();
					selectNode(nodeData, true);
					draggingSelection = true;
				}
			}

			return;
		}

		// Prevent dragging the background from highlighting text
		if (dragInitiationTarget === document.body) {
			event.preventDefault();
		}
	}

	// Middle mouse button
	if (event.button === 1) {
		if (!panningSelection) {
			panningSelection = true;
			return;
		}
	}
}

function graphMousemoveHandler(event) {
	const mousePosition = [event.clientX, event.clientY];
	const mouseDelta = [event.movementX / graphScale, event.movementY / graphScale];

	if (panningSelection && (event.movementX !== 0 || event.movementY !== 0)) {
		graphOffsetX += mouseDelta[0];
		graphOffsetY += mouseDelta[1];
		updateGraphView();
	}

	if (draggingSelection) {
		moveSelectedNodes(mouseDelta);

		// Prevent mouse drag from highlighting text
		event.preventDefault();
	}

	if (cursorWireConnection) {
		const attachedConnectorElement = cursorWireConnection.node.element.querySelector(`.connector[data-identifier="${cursorWireConnection.identifier}"]`);

		if (cursorWireDirectionOnNodeSide === "out") updateWirePath(cursorWireConnection.wire, attachedConnectorElement, mousePosition);
		else if (cursorWireDirectionOnNodeSide === "in") updateWirePath(cursorWireConnection.wire, mousePosition, attachedConnectorElement);

		// Prevent mouse drag from highlighting text
		event.preventDefault();
	}

	// Prevent dragging the background from highlighting text
	if (dragInitiationTarget === document.body) {
		event.preventDefault();
	}
}

function graphMouseupHandler(event) {
	const target = event.target;

	// Left mouse button
	if (event.button === 0) {
		dragInitiationTarget = undefined;

		// Replace current selection if the selected group was not moved when clicking on a selected node
		if (target.closest("section") && !target.closest("label")) {
			const nodeElement = target.closest("section");
			const nodeData = nodeDatabase.find(node => node.element === nodeElement);

			if (nodeData.selected && !event.shiftKey && !event.ctrlKey && !selectionWasDragged) {
				deselectAllNodesExcept([nodeData]);
				selectNode(nodeData, true);
			}
		}

		if (cursorWireConnection) {
			const nodeSideData = cursorWireConnection.node;
			const nodeSideIdentifier = cursorWireConnection.identifier;

			if (target.closest(".connector")) {
				const nodeElement = target.closest("section");
				const nodeData = nodeDatabase.find(node => node.element === nodeElement);
				const nodeIdentifier = target.closest(".connector").dataset["identifier"];

				if (cursorWireDirectionOnNodeSide === "out") connectWire(nodeSideData, nodeSideIdentifier, nodeData, nodeIdentifier);
				else if (cursorWireDirectionOnNodeSide === "in") connectWire(nodeData, nodeIdentifier, nodeSideData, nodeSideIdentifier);
				saveGraph();
			}

			const path = cursorWireConnection.wire;
			destroyWirePath(path);

			cursorWireConnection = null;
			cursorWireDirectionOnNodeSide = null;
		}

		draggingSelection = false;
		selectionWasDragged = false;
	}

	// Stop panning with left or middle mouse
	if (event.button === 1 || event.button === 0) {
		if (panningSelection) {
			panningSelection = false;
			return;
		}
	}
}

function graphClickHandler(event) {
	const target = event.target;

	if (target.closest("input")) {
		if (target !== document.activeElement) target.select();
		event.stopPropagation();

		return;
	}
}

function graphWheelHandler(event) {
	const minScale = 0.1;
	const maxScale = 6.0;
	const SCALE_SPEED = 0.5;
	const WHEEL_RATE = 1 / 600;

	if (event.ctrlKey) {
		// Prevent the default browser zoom behavior
		event.preventDefault();

		// Calculate a zoom factor as a scalar multiplier of the current zoom
		const scroll = event.deltaY;
		let zoomFactor = 1 + Math.abs(scroll) * WHEEL_RATE;
		if (scroll > 0) zoomFactor = 1 / zoomFactor;

		// Clamp zoom factor to the min and max scale
		zoomFactor = Math.min(Math.max(graphScale * zoomFactor, minScale), maxScale) / graphScale;

		graphScale *= zoomFactor;

		const { x, y, width, height } = event.target.closest("body").getBoundingClientRect();

		// Calculate the change in size in viewport
		const deltaSizeX = width - width / zoomFactor;
		const deltaSizeY = height - height / zoomFactor;

		// Apply a position adjustment to keep mouse centred
		const deltaX = deltaSizeX * ((event.x - x) / width);
		const deltaY = deltaSizeY * ((event.y - y) / height);
		graphOffsetX -= (deltaX / graphScale) * zoomFactor;
		graphOffsetY -= (deltaY / graphScale) * zoomFactor;
	} else {
		// Shift flips axis
		if (event.shiftKey) {
			graphOffsetX -= (event.deltaY / graphScale) * SCALE_SPEED;
			graphOffsetY -= (event.deltaX / graphScale) * SCALE_SPEED;
		} else {
			graphOffsetX -= (event.deltaX / graphScale) * SCALE_SPEED;
			graphOffsetY -= (event.deltaY / graphScale) * SCALE_SPEED;
		}
	}

	updateGraphView();
}

function graphKeydownHandler(event) {
	if (event.key.toLowerCase() === "a" && event.ctrlKey && document.activeElement.tagName !== "INPUT") {
		if (event.shiftKey) deselectAllNodes();
		else selectAllNodes();

		event.preventDefault();
		return;
	}

	if (event.key.toLowerCase() === "tab") {
		document.querySelector(".material-viewports").classList.toggle("full");
	}

	if (event.key.toLowerCase() === "g" && !event.ctrlKey && !event.shiftKey) {
		addNode("Gradient");
		saveGraph();
	}

	if (event.key.toLowerCase() === "p" && !event.ctrlKey && !event.shiftKey) {
		addNode("Perlin Noise");
		saveGraph();
	}

	if (event.key.toLowerCase() === "v" && !event.ctrlKey && !event.shiftKey) {
		addNode("Voronoi Noise");
		saveGraph();
	}

	if (event.key.toLowerCase() === "b" && !event.ctrlKey && !event.shiftKey) {
		addNode("Blend");
		saveGraph();
	}

	if (event.key.toLowerCase() === "l" && !event.ctrlKey && !event.shiftKey) {
		addNode("Levels");
		saveGraph();
	}

	if (event.key.toLowerCase() === "s" && !event.ctrlKey && !event.shiftKey) {
		addNode("Slicer");
		saveGraph();
	}

	if (event.key.toLowerCase() === "t" && !event.ctrlKey && !event.shiftKey) {
		addNode("Transform");
		saveGraph();
	}

	// if (event.key.toLowerCase() === "c" && !event.ctrlKey && !event.shiftKey) {
	// 	addNode("Color");
	// }

	if (event.key.toLowerCase() === "enter" && document.activeElement.closest("input")) {
		document.activeElement.closest("input").blur();
	}

	if (event.key.toLowerCase() === "backspace" || event.key.toLowerCase() === "delete") {
		if (document.activeElement.tagName !== "INPUT") removeSelectedNodes();
	}
}

export function addNode(nodeName, x, y, startSelected = false) {
	const nodeGraph = document.querySelector(".node-graph");

	const nodeData = Node
		.createNode(nodeName, x ?? (nodeGraph.clientWidth / (graphScale * 2) - graphOffsetX - 100), y ?? (nodeGraph.clientHeight / (graphScale * 2) - graphOffsetY - 200), startSelected);

	nodeGraph.appendChild(nodeData.element);
	nodeDatabase.push(nodeData);
	updateNodePosition(nodeData);

	return nodeData;
}

export function removeNode(nodeData) {
	// Collect every wire touching this node first, then disconnect (since disconnectWire mutates the connection arrays).
	// Each connection record already stores the counterpart's identifier, so no scanning is needed.
	const toDisconnect = [];

	Object.entries(nodeData.inConnections).forEach(([inIdentifier, incomingWires]) => {
		incomingWires.forEach((connection) => {
			toDisconnect.push([connection.node, connection.identifier, nodeData, inIdentifier]);
		});
	});

	Object.entries(nodeData.outConnections).forEach(([outIdentifier, outgoingWires]) => {
		outgoingWires.forEach((connection) => {
			toDisconnect.push([nodeData, outIdentifier, connection.node, connection.identifier]);
		});
	});

	toDisconnect.forEach((args) => disconnectWire(...args));

	// Deselect the node to remove the selection outline element
	deselectNode(nodeData);

	// Remove the node from the DOM
	nodeData.element.parentElement.removeChild(nodeData.element);

	// Remove the node from the node database
	nodeDatabase.splice(nodeDatabase.indexOf(nodeData), 1);
}

function removeSelectedNodes() {
	// The Input and Output nodes are protected from user deletion since they're the graph's endpoints
	nodeDatabase
		.filter((node) => node.selected && node.name !== "Input" && node.name !== "Output")
		.forEach((nodeData) => removeNode(nodeData));
	saveGraph();
}

function moveSelectedNodes(deltaMove) {
	nodeDatabase.forEach((nodeData) => {
		if (nodeData.selected) {
			nodeData.x += deltaMove[0];
			nodeData.y += deltaMove[1];
			updateNodePosition(nodeData);
		}
	});

	if (deltaMove[0] !== 0 || deltaMove[1] !== 0) selectionWasDragged = true;

	if (selectionWasDragged) saveGraph();
}

function selectAllNodes() {
	nodeDatabase.forEach((nodeData) => {
		selectNode(nodeData, false);
	});
}

function deselectAllNodes() {
	nodeDatabase.forEach((nodeData) => {
		deselectNode(nodeData);
	});
}

function deselectAllNodesExcept(nodesArray) {
	nodeDatabase.forEach((nodeData => {
		if (!nodesArray.includes(nodeData)) deselectNode(nodeData);
	}));
}

function selectNode(nodeData, bringToFront) {
	if (nodeData.selected) return;

	nodeData.element.classList.add("selected");
	if (bringToFront) nodeData.element.parentNode.insertAdjacentElement("beforeend", nodeData.element);
	nodeData.selected = Node.createNodeOutlineElement(nodeData);
	updateSelectionOutline(nodeData);
}

function deselectNode(nodeData) {
	if (!nodeData.selected) return;

	nodeData.element.classList.remove("selected");
	nodeData.selected.parentNode.removeChild(nodeData.selected);
	nodeData.selected = null;
}

function updateSelectionOutline(nodeData) {
	if (!nodeData.selected) return;

	const bounds = nodeData.element.getBoundingClientRect();
	const scale = bounds.width / nodeData.element.clientWidth;
	nodeData.selected.style.width = `${bounds.width}px`;
	nodeData.selected.style.height = `${bounds.height}px`;
	nodeData.selected.style.left = `${bounds.left}px`;
	nodeData.selected.style.top = `${bounds.top}px`;
	nodeData.selected.style.borderRadius = `${4 * scale}px`;
}

export function updateGraphView() {
	if (!awaitingGraphViewUpdate) {
		requestAnimationFrame(() => {
			nodeDatabase.forEach((node) => {
				updateNodePosition(node);
			});
			awaitingGraphViewUpdate = false;
		});
	}
	awaitingGraphViewUpdate = true;
}

function updateNodePosition(nodeData) {
	nodeData.element.style.transform = `scale(${graphScale}) translate(${nodeData.x + graphOffsetX}px, ${nodeData.y + graphOffsetY}px)`;
	updateSelectionOutline(nodeData);

	// Update any wires connected to out connections
	Object.keys(nodeData.outConnections).forEach((identifier) => {
		const connections = nodeData.outConnections[identifier];

		connections.forEach((connection) => {
			const path = connection.wire;

			const outConnectorElement = nodeData.element;
			const outConnector = outConnectorElement.querySelector(`.connector[data-identifier="${identifier}"]`);

			const inConnectorElement = connection.node.element;
			const inConnector = inConnectorElement.querySelector(`.connector[data-identifier="${connection.identifier}"]`);

			updateWirePath(path, outConnector, inConnector);
		});
	});

	// Update any wires connected to in connections
	Object.keys(nodeData.inConnections).forEach((identifier) => {
		const connections = nodeData.inConnections[identifier];

		connections.forEach((connection) => {
			const path = connection.wire;

			const inConnectorElement = nodeData.element;
			const inConnector = inConnectorElement.querySelector(`.connector[data-identifier="${identifier}"]`);

			const outConnectorElement = connection.node.element;
			const outConnector = outConnectorElement.querySelector(`.connector[data-identifier="${connection.identifier}"]`);

			updateWirePath(path, outConnector, inConnector);
		});
	});
}

function updateWirePath(path, outConnector, inConnector) {
	let outConnectorX;
	let outConnectorY;

	if (outConnector instanceof HTMLElement) {
		const outConnectorRect = outConnector.getBoundingClientRect();
		outConnectorX = outConnectorRect.left + outConnectorRect.width / 2;
		outConnectorY = outConnectorRect.top + outConnectorRect.height / 2;
	}
	else {
		outConnectorX = outConnector[0];
		outConnectorY = outConnector[1];
	}

	let inConnectorX;
	let inConnectorY;
	if (inConnector instanceof HTMLElement) {
		const inConnectorRect = inConnector.getBoundingClientRect();
		inConnectorX = inConnectorRect.left + inConnectorRect.width / 2;
		inConnectorY = inConnectorRect.top + inConnectorRect.height / 2;
	}
	else {
		inConnectorX = inConnector[0];
		inConnectorY = inConnector[1];
	}

	const horizontalGap = Math.abs(outConnectorX - inConnectorX);
	const curveLength = 200;
	const curveFalloffRate = curveLength * Math.PI * 2;
	const curveAmount = (-(2 ** (-10 * horizontalGap / curveFalloffRate)) + 1);
	const curve = curveAmount * curveLength;

	let pathString = `M${outConnectorX},${outConnectorY} C${outConnectorX + curve},${outConnectorY} ${inConnectorX - curve},${inConnectorY} ${inConnectorX},${inConnectorY}`;
	path.setAttribute("d", pathString);
}

function createWirePath(outConnector, inConnector) {
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	updateWirePath(path, outConnector, inConnector);
	document.querySelector("svg.wires").appendChild(path);
	return path;
}

function destroyWirePath(path) {
	path.parentElement.removeChild(path);
}

export function connectWire(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier) {
	// Prevent connecting nodes as input->input or output->output
	if (!(outNodeIdentifier in outNodeData.outConnections && inNodeIdentifier in inNodeData.inConnections)) return;

	// Prevent connecting a node to itself
	if (outNodeData === inNodeData) return;

	// Prevent adding duplicate identical connections
	if (connectionAlreadyExists(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier)) return;

	// Connect the wire to the output
	const outConnection = { node: inNodeData, identifier: inNodeIdentifier, wire: null };
	outNodeData.outConnections[outNodeIdentifier].push(outConnection);

	// Clear any existing inputs because inputs are exclusive to one wire
	let restoreWireIfCycle;
	inNodeData.inConnections[inNodeIdentifier].forEach((inConnectionSource) => {
		const outNodeDataForConnection = inConnectionSource.node;
		const outNodeIdentifierForConnection = inConnectionSource.identifier;
		restoreWireIfCycle = [outNodeDataForConnection, outNodeIdentifierForConnection, inNodeData, inNodeIdentifier];
		disconnectWire(outNodeDataForConnection, outNodeIdentifierForConnection, inNodeData, inNodeIdentifier);
	});

	// Connect the wire to the input
	const inConnection = { node: outNodeData, identifier: outNodeIdentifier, wire: null };
	inNodeData.inConnections[inNodeIdentifier].push(inConnection);

	const causedCycle = Node.detectCycle(inNodeData);
	if (causedCycle) {
		disconnectWire(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier);

		if (restoreWireIfCycle) connectWire(...restoreWireIfCycle);

		return;
	}

	// Notify widgets on this node bound to the identifier so they can update
	Node.notifyBoundWidgetsOfUpdatedProperty(inNodeData, inNodeIdentifier);

	// Recompute everything downstream
	Node.recomputeDownstreamNodes(inNodeData);

	// Find the connector dot DOM elements and increment the connection degrees
	const outConnector = outNodeData.element.querySelector(`.connector[data-identifier="${outNodeIdentifier}"]`);
	const inConnector = inNodeData.element.querySelector(`.connector[data-identifier="${inNodeIdentifier}"]`);
	outConnector.dataset["outdegree"]++;
	inConnector.dataset["indegree"]++;

	// Create an SVG wire path and save its reference on both connection sides
	const wire = createWirePath(outConnector, inConnector);
	outConnection.wire = wire;
	inConnection.wire = wire;
}

function disconnectWire(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier) {
	const outConnections = outNodeData.outConnections[outNodeIdentifier];
	const inConnections = inNodeData.inConnections[inNodeIdentifier];

	// Find and destroy the SVG wire path
	const connection = outConnections.find(c => c.node === inNodeData && c.identifier === inNodeIdentifier);

	// Filter the out/in connections to not include the in/out identifiers
	outConnections.splice(outConnections.indexOf(connection), 1);
	inConnections.splice(inConnections.indexOf(connection), 1);

	// Find the connector dot DOM elements and decrement the connection degrees
	const outConnector = outNodeData.element.querySelector(`.connector[data-identifier="${outNodeIdentifier}"]`);
	const inConnector = inNodeData.element.querySelector(`.connector[data-identifier="${inNodeIdentifier}"]`);
	outConnector.dataset["outdegree"]--;
	inConnector.dataset["indegree"]--;

	// The wire SVG might not exist because the wire is being immediately destroyed due to a cycle, before the SVG was created for it
	if (connection.wire) destroyWirePath(connection.wire);

	// Notify widgets on this node bound to the identifier so they can update
	Node.notifyBoundWidgetsOfUpdatedProperty(inNodeData, inNodeIdentifier);

	// Recompute everything downstream
	Node.recomputeDownstreamNodes(inNodeData);
}

function connectionAlreadyExists(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier) {
	const outConnector = outNodeData.outConnections[outNodeIdentifier];
	const outConnection = outConnector.find(c => c.identifier === inNodeIdentifier);

	const inConnector = inNodeData.inConnections[inNodeIdentifier];
	const inConnection = inConnector.find(c => c.identifier === outNodeIdentifier);

	if (!outConnection || !inConnection) return false;

	const inNodeDataConnectedToOutConnection = outConnection.node;
	const outNodeConnectedToInConnection = inConnection.node;

	return inNodeDataConnectedToOutConnection === inNodeData && outNodeConnectedToInConnection === outNodeData;
}
