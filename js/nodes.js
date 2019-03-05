const perlinBlueprint = {
	name: "Perlin Noise",
	properties: [
		{
			name: "THUMBNAIL",
			display: "thumbnail",
			out: ["2d_color_pattern"],
			in: [],
		},
		{
			name: "Scale",
			display: "input",
			out: [],
			in: ["0d_float_scale"],
			min: 1,
			max: Infinity,
			default: 10,
		},
		{
			name: "Seed",
			display: "input",
			out: [],
			in: ["0d_int_seed"],
			min: -Infinity,
			max: Infinity,
			default: 0,
		},
	],
};

const blendBlueprint = {
	name: "Blend",
	properties: [
		{
			name: "THUMBNAIL",
			display: "thumbnail",
			out: ["2d_color_composite"],
			in: ["2d_color_foreground", "2d_color_background"],
		},
		{
			name: "Blend Mode",
			display: "input",
			in: [],
			default: "Normal",
			out: [],
		},
		{
			name: "Opacity",
			display: "input",
			out: [],
			in: ["0d_float_opacity"],
			min: 0,
			max: 1,
			default: 0.5,
		},
	],
};

const nodeDatabase = [];

let cursorWireConnection = null;
let cursorWireDirectionOnNodeSide = null;

let draggingSelection = false;
let selectionWasDragged = false;

function nodes() {
	const perlin1 = createNode(perlinBlueprint, 50, 50);
	const perlin2 = createNode(perlinBlueprint, 50, 500);
	const blend = createNode(blendBlueprint, 1000, 300);
	
	connectWire(perlin1, "2d_color_pattern", blend, "2d_color_foreground");
	connectWire(perlin2, "2d_color_pattern", blend, "2d_color_background");
	setupEvents();
}

function setupEvents() {
	document.body.addEventListener("mousedown", nodeMousedownHandler);
	document.body.addEventListener("mousemove", nodeMousemoveHandler);
	document.body.addEventListener("mouseup", nodeMouseupHandler);
	document.body.addEventListener("click", nodeClickHandler);
}

function nodeMousedownHandler(event) {
	const target = event.target;

	// No nodes selected (clear selection)
	if (!target.closest("section")) {
		deselectAllNodes();
		return;
	}

	// Connector dot selected
	if (target.closest("div.connector")) {
		const connector = target.closest("div.connector");
		const mousePosition = [event.clientX, event.clientY];
		
		let path;
		cursorWireDirectionOnNodeSide = connector.dataset["direction"];
		if (cursorWireDirectionOnNodeSide === "out") path = createWirePath(connector, mousePosition);
		else if (cursorWireDirectionOnNodeSide === "in") path = createWirePath(mousePosition, connector);

		cursorWireConnection = { node: null, identifier: null, wire: null };
		cursorWireConnection.node = nodeDatabase.find(node => node.element === connector.closest("section"));
		cursorWireConnection.identifier = connector.dataset["identifier"];
		cursorWireConnection.wire = path;

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
			if (event.shiftKey || event.ctrlKey) {
				selectNode(nodeData);
				draggingSelection = true;

				// Prevent shift-selection from highlighting text
				event.preventDefault();
			}
			else {
				deselectAllNodes();
				selectNode(nodeData);
				draggingSelection = true;
			}
		}

		return;
	}
}

function nodeMousemoveHandler(event) {
	if (draggingSelection) {
		moveSelectedNodes(event.movementX, event.movementY);
		
		// Prevent mouse drag from highlighting text
		event.preventDefault();
	}

	if (cursorWireConnection) {
		const attachedConnectorElement = cursorWireConnection.node.element.querySelector(`.connector[data-identifier="${cursorWireConnection.identifier}"]`);
		const mousePosition = [event.clientX, event.clientY];
		
		if (cursorWireDirectionOnNodeSide === "out") updateWire(cursorWireConnection.wire, attachedConnectorElement, mousePosition);
		else if (cursorWireDirectionOnNodeSide === "in") updateWire(cursorWireConnection.wire, mousePosition, attachedConnectorElement);

		// Prevent mouse drag from highlighting text
		event.preventDefault();
	}
}

function nodeMouseupHandler(event) {
	const target = event.target;

	if (target.closest("section")) {
		const nodeElement = target.closest("section");
		const nodeData = nodeDatabase.find(node => node.element === nodeElement);

		if (nodeData.selected && !event.shiftKey && !selectionWasDragged) {
			deselectAllNodes();
			selectNode(nodeData);
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
		}

		const path = cursorWireConnection.wire;
		destroyWirePath(path);

		cursorWireConnection = null;
		cursorWireDirectionOnNodeSide = null;
	}

	draggingSelection = false;
	selectionWasDragged = false;
}

function nodeClickHandler(event) {
	const target = event.target;

	if (target.closest("input")) {
		if (target !== document.activeElement) target.select();
		event.stopPropagation();

		return;
	}
}

function moveSelectedNodes(dx, dy) {
	nodeDatabase.forEach((nodeData) => {
		if (nodeData.selected) {
			nodeData.x += dx;
			nodeData.y += dy;
			updateNodePosition(nodeData);
		}
	});

	if (dx !== 0 || dy !== 0) selectionWasDragged = true;
}

function selectAllNodes() {
	nodeDatabase.forEach((nodeData) => {
		selectNode(nodeData);
	});
}

function deselectAllNodes() {
	nodeDatabase.forEach((nodeData) => {
		deselectNode(nodeData);
	});
}

function selectNode(nodeData) {
	nodeData.element.classList.add("selected");
	nodeData.selected = true;
}

function deselectNode(nodeData) {
	nodeData.element.classList.remove("selected");
	nodeData.selected = false;
}

function updateNodePosition(nodeData) {
	nodeData.element.style.left = `${nodeData.x}px`;
	nodeData.element.style.top = `${nodeData.y}px`;

	// Update any wires connected to out connections
	Object.keys(nodeData.outConnections).forEach((identifier) => {
		const connections = nodeData.outConnections[identifier];

		connections.forEach((connection) => {
			const path = connection.wire;

			const outConnectorElement = nodeData.element;
			const outConnector = outConnectorElement.querySelector(`.connector[data-identifier="${identifier}"]`);

			const inConnectorElement = connection.node.element;
			const inConnector = inConnectorElement.querySelector(`.connector[data-identifier="${connection.identifier}"]`);

			updateWire(path, outConnector, inConnector);
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

			updateWire(path, outConnector, inConnector);
		});
	});
}

function updateWire(path, outConnector, inConnector) {
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

	let pathString = `M ${outConnectorX} ${outConnectorY} C ${outConnectorX + curve} ${outConnectorY}, ${inConnectorX - curve} ${inConnectorY}, ${inConnectorX} ${inConnectorY}`;
	path.setAttribute("d", pathString);
}

function createWirePath(outConnector, inConnector) {
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	updateWire(path, outConnector, inConnector);
	document.querySelector("svg.wires").appendChild(path);
	return path;
}

function destroyWirePath(path) {
	document.querySelector("svg.wires").removeChild(path);
}

function connectWire(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier) {
	// Prevent connecting nodes from input to input or output to output
	if (outNodeData.outConnections[outNodeIdentifier] === undefined || inNodeData.inConnections[inNodeIdentifier] === undefined) return;

	// Prevent connecting a node to itself
	if (outNodeData === inNodeData) return;

	// Connect the wire to the output
	const outConnection = { node: inNodeData, identifier: inNodeIdentifier, wire: null };
	outNodeData.outConnections[outNodeIdentifier].push(outConnection);

	// Clear any existing inputs because inputs are exclusive to one wire
	inNodeData.inConnections[inNodeIdentifier].forEach((inConnectionSource) => {
		outNodeDataForConnection = inConnectionSource.node;
		outNodeIdentifierForConnection = inConnectionSource.identifier;
		disconnectWire(outNodeDataForConnection, outNodeIdentifierForConnection, inNodeData, inNodeIdentifier);
	});

	// Connect the wire to the input
	const inConnection = { node: outNodeData, identifier: outNodeIdentifier, wire: null };
	inNodeData.inConnections[inNodeIdentifier].push(inConnection);

	const outConnector = outNodeData.element.querySelector(`.connector[data-identifier="${outNodeIdentifier}"]`);
	const inConnector = inNodeData.element.querySelector(`.connector[data-identifier="${inNodeIdentifier}"]`);
	const wire = createWirePath(outConnector, inConnector);

	outConnection.wire = wire;
	inConnection.wire = wire;
}

function disconnectWire(outNodeData, outNodeIdentifier, inNodeData, inNodeIdentifier) {
	const path = outNodeData.outConnections[outNodeIdentifier].find(connection => connection.identifier === inNodeIdentifier).wire;
	destroyWirePath(path);

	outNodeData.outConnections[outNodeIdentifier] = outNodeData.outConnections[outNodeIdentifier].filter(connection => connection.identifier !== inNodeIdentifier);
	inNodeData.inConnections[inNodeIdentifier] = inNodeData.inConnections[inNodeIdentifier].filter(connection => connection.identifier !== outNodeIdentifier);
}

function createNode(blueprint, xDestination, yDestination) {
	const node = document.createElement("section");
	node.style.left = `${xDestination}px`;
	node.style.top = `${yDestination}px`;

	const title = document.createElement("h1");
	title.innerHTML = blueprint.name;
	node.appendChild(title);

	blueprint.properties.forEach((property) => {
		// Create property row
		const row = document.createElement("div");
		row.classList.add("row");
		row.classList.add(property.display);

		// Add in connectors
		appendConnectors(row, property.in, "in");

		switch (property.display) {
		case "thumbnail":
			const canvas = document.createElement("canvas");
			row.appendChild(canvas);
			renderThumbnail(canvas);
			break;
		case "label":
		case "input":
			const label = document.createElement("label");
			label.innerHTML = property.name;

			if (property.display === "input") {
				const input = document.createElement("input");
				input.value = property.default;
				label.appendChild(input);
			}
	
			const colon = document.createElement("colon");
			label.appendChild(colon);
	
			row.appendChild(label);
			break;
		}

		// Add out connectors
		appendConnectors(row, property.out, "out");

		// Add property row to node
		node.appendChild(row);
	});
	
	document.body.appendChild(node);

	const nodeData = {
		name: blueprint.name,
		blueprint: blueprint,
		element: node,
		selected: false,
		x: xDestination,
		y: yDestination,
		outConnections: getOutIdentifiersMap(blueprint),
		inConnections: getInIdentifiersMap(blueprint),
	};

	nodeDatabase.push(nodeData);
	return nodeData;
}

function getOutIdentifiersFromBlueprint(blueprint) {
	return blueprint.properties.filter(p => p.out && p.out.length >= 1).reduce((a, b) => a.concat(b.out), []);
}

function getInIdentifiersFromBlueprint(blueprint) {
	return blueprint.properties.filter(p => p.in && p.in.length >= 1).reduce((a, b) => a.concat(b.in), []);
}

function getOutIdentifiersMap(blueprint) {
	const outMap = {};
	getOutIdentifiersFromBlueprint(blueprint).forEach((identifier) => {
		outMap[identifier] = [];
	});
	return outMap;
}

function getInIdentifiersMap(blueprint) {
	const inMap = {};
	getInIdentifiersFromBlueprint(blueprint).forEach((identifier) => {
		inMap[identifier] = [];
	});
	return inMap;
}

function appendConnectors(row, identifierList, inOrOut) {
	identifierList.forEach((identifier, index) => {
		row.classList.add(inOrOut);

		const connector = document.createElement("div");
		connector.classList.add("connector");
		connector.classList.add(`group-${index + 1}-of-${identifierList.length}`);
		connector.dataset["identifier"] = identifier;
		connector.dataset["direction"] = inOrOut;

		row.appendChild(connector);
	});
}
