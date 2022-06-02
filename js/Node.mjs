import * as Node_PerlinNoise from "/Brush-Nodes/nodes/PerlinNoise.mjs";
import * as Node_VoronoiNoise from "/Brush-Nodes/nodes/VoronoiNoise.mjs";
import * as Node_Gradient from "/Brush-Nodes/nodes/Gradient.mjs";
import * as Node_Blend from "/Brush-Nodes/nodes/Blend.mjs";
import * as Node_Levels from "/Brush-Nodes/nodes/Levels.mjs";
import * as Node_Slicer from "/Brush-Nodes/nodes/Slicer.mjs";
import * as Node_Color from "/Brush-Nodes/nodes/Color.mjs";
import * as Node_Input from "/Brush-Nodes/nodes/Input.mjs";
import * as Node_Output from "/Brush-Nodes/nodes/Output.mjs";
const nodes = {
	"Perlin Noise": Node_PerlinNoise,
	"Voronoi Noise": Node_VoronoiNoise,
	"Gradient": Node_Gradient,
	"Blend": Node_Blend,
	"Levels": Node_Levels,
	"Slicer": Node_Slicer,
	"Color": Node_Color,
	"Input": Node_Input,
	"Output": Node_Output,
};

import * as Widget_Spacer from "/Brush-Nodes/nodes/widgets/Spacer.mjs";
import * as Widget_Thumbnail from "/Brush-Nodes/nodes/widgets/Thumbnail.mjs";
import * as Widget_Label from "/Brush-Nodes/nodes/widgets/Label.mjs";
import * as Widget_Input from "/Brush-Nodes/nodes/widgets/Input.mjs";
import * as Widget_Dropdown from "/Brush-Nodes/nodes/widgets/Dropdown.mjs";
import * as Widget_Output from "/Brush-Nodes/nodes/widgets/Output.mjs";
const widgets = {
	"Spacer": Widget_Spacer,
	"Thumbnail": Widget_Thumbnail,
	"Label": Widget_Label,
	"Input": Widget_Input,
	"Dropdown": Widget_Dropdown,
	"Output": Widget_Output,
};

export const SQUARE_RESOLUTION = [512, 512];
export const STRIP_RESOLUTION = [2048, 128];
export const formFactorResolutions = {
	"Square": SQUARE_RESOLUTION,
	"Strip": STRIP_RESOLUTION,
}
export const formFactorList = Object.keys(formFactorResolutions);
export function formFactorFromResolution(resolution) {
	const pairs = Object.entries(formFactorResolutions);
	const match = pairs.find(([_, res]) => res[0] === resolution[0] && res[1] === resolution[1]);
	return match[0];
}

export async function createNode(nodeName, xPlacement, yPlacement, startSelected) {
	// Get the definition object for the chosen node type
	const node = nodes[nodeName];
	const definition = node.getDefinition();

	// Define the object that holds all the state for the node
	const nodeData = {
		name: definition.name,
		element: undefined,
		selected: null,
		inConnections: buildEmptyConnectionsMap(definition, "in"),
		outConnections: buildEmptyConnectionsMap(definition, "out"),
		rowData: buildRowDataMap(definition),
		propertyValues: buildDefaultPropertyValuesMap(definition),
		x: xPlacement,
		y: yPlacement,
	};

	// Fill in the other fields that require the object
	nodeData.element = createNodeElement(nodeData, definition);
	if (startSelected) createNodeOutlineElement(nodeData);
	updateRowDataToPropertyValues(nodeData, definition);

	// Set up the shader if the node has one
	if (node.setup) await node.setup();

	// Compute all the output values from the inputs
	await recomputeProperties(nodeData);

	return nodeData;
}

function buildEmptyConnectionsMap(definition, direction) {
	const properties = definition.properties.filter(property => property.direction === direction);
	const connectionsMap = {};
	properties.forEach((property) => {
		connectionsMap[property.identifier] = [];
	});
	return connectionsMap;
}

function buildRowDataMap(definition) {
	const rowsMap = {};
	definition.rows.forEach((row) => {
		if (row.name !== undefined) rowsMap[row.name] = row.data || {};
	});
	return rowsMap;
}

function buildDefaultPropertyValuesMap(definition) {
	const propertiesMap = {};
	definition.properties.forEach((property) => {
		propertiesMap[property.identifier] = property.default;
	});
	return propertiesMap;
}

function updateRowDataToPropertyValues(nodeData, definition) {
	Object.keys(nodeData.rowData).forEach((rowName) => {
		const rowData = nodeData.rowData[rowName];
		const rowDefinition = definition.rows.find(r => r.name === rowName);

		if (!rowDefinition) return;
		const widget = widgets[rowDefinition.type];

		if (!widget.resetRowDataToPropertyValue) return;
		widget.resetRowDataToPropertyValue(nodeData, rowData, rowDefinition);
	});
}

export function createNodeOutlineElement(nodeData) {
	const div = document.createElement("div");
	div.classList.add("selection-outline");
	nodeData.element.insertAdjacentElement("beforebegin", div);
	return div;
}

function createNodeElement(nodeData, definition) {
	// Create the node container element
	const nodeElement = document.createElement("section");

	// Give it a title element
	const titleElement = document.createElement("h1");
	titleElement.innerHTML = definition.name;
	nodeElement.appendChild(titleElement);

	// Give it all the specified rows
	definition.rows.forEach((row) => nodeElement.appendChild(createRow(row, nodeData, definition)));

	// Append the node element to the DOM
	return nodeElement;
}

function createRow(row, nodeData, definition) {
	// Create property row
	const rowElement = document.createElement("div");
	rowElement.classList.add("row");
	rowElement.dataset["name"] = row.name;

	// Add any in connectors
	appendConnectors(row, rowElement, "in");

	// Add the row's widget
	const widgetElement = widgets[row.type].createWidget(nodeData, row, definition);
	rowElement.appendChild(widgetElement);

	// Add any out connectors
	appendConnectors(row, rowElement, "out");

	return rowElement;
}

function appendConnectors(row, rowElement, direction) {
	if (!row.connectors) return;

	const connectorsList = row.connectors.filter(c => c.direction === direction);

	connectorsList.forEach((connector, index) => {
		// Create connector dot
		const connectorElement = document.createElement("div");
		connectorElement.classList.add("connector", `group-${index + 1}-of-${connectorsList.length}`, connector.direction, `dimensions-${connector.dimensions}`, connector.type);
		connectorElement.dataset["identifier"] = connector.identifier;
		connectorElement.dataset["direction"] = connector.direction;
		connectorElement.dataset["dimensions"] = connector.dimensions;
		connectorElement.dataset["type"] = connector.type;
		connectorElement.dataset[`${direction}degree`] = 0;

		// Add it to the row
		rowElement.appendChild(connectorElement);
	});

	// Update the row class to associate the row with it containing an in or out connector
	if (connectorsList.length >= 1) rowElement.classList.add(direction);
}

export function getInPropertyValue(nodeData, identifier) {
	// Return the out value from the property's connected source node, if connected
	const connection = nodeData.inConnections[identifier][0];
	if (connection) return getOutPropertyValue(connection.node, connection.identifier);

	// Otherwise, return the value from this node's property that has been updated by the associated widget
	return nodeData.propertyValues[identifier];
}

export function getOutPropertyValue(nodeData, identifier) {
	return nodeData.propertyValues[identifier];
}

export function setPropertyValue(nodeData, identifier, value) {
	nodeData.propertyValues[identifier] = value;

	notifyBoundWidgetsOfUpdatedProperty(nodeData, identifier);
}

export async function setFinalPropertyValueAndPropagate(nodeData, identifier, value) {
	const rows = nodes[nodeData.name].getDefinition().rows;
	const row = rows.find(row => row.options && row.options.inputBoundIdentifier === identifier);

	// Update the row's widget state data
	const savedRowData = nodeData.rowData[row.name];
	savedRowData.inputValue = value;
	if (widgets[row.type].updateElementDisplayValue) widgets[row.type].updateElementDisplayValue(nodeData, row);

	// Set the new value and update the node with any bound widgets
	setPropertyValue(nodeData, identifier, value)

	// Recompute this node with the new input
	await recomputeProperties(nodeData);

	// Recompute the whole downstream graph
	await recomputeDownstreamNodes(nodeData);
}

export function getBoundIdentifier(nodeData, identifier) {
	const rows = nodes[nodeData.name].getDefinition().rows;
	return rows.find(row => row.name === identifier).options.inputBoundIdentifier;
}

export function notifyBoundWidgetsOfUpdatedProperty(nodeData, identifier) {
	const rows = nodes[nodeData.name].getDefinition().rows;
	const outputBoundRow = rows.find(row => row.options && row.options.outputBoundIdentifier === identifier);
	if (!outputBoundRow) return;

	const widgetToNotify = widgets[outputBoundRow.type];
	if (widgetToNotify && widgetToNotify.propertyValueWasUpdated) {
		widgetToNotify.propertyValueWasUpdated(nodeData, outputBoundRow);
	}
}

export async function recomputeProperties(nodeData) {
	setTimeout(async () => {
		if (nodes[nodeData.name].compute) {
			await nodes[nodeData.name].compute(nodeData);
			window?.updateGraphView();
		}
		else {
			console.error(`${nodeData.name} node has no compute() function implementation.`);
		}
	}, 0);
}

export function detectCycle(nodeData) {
	const depthGroups = findChildNodeDepths(nodeData);
	if (!depthGroups) {
		console.info("Cycle detected");
		return true;
	}
	return false;
}

// Recomputes all downstream nodes, returning true if a cycle was found
export async function recomputeDownstreamNodes(nodeData) {
	setTimeout(async () => {
		const depthGroups = findChildNodeDepths(nodeData) || [];
		const promiseDone = [];

		depthGroups.forEach((depthGroup) => {
			depthGroup.forEach(async (node) => {
				promiseDone.push(await recomputeProperties(node));
			});
		});
		await Promise.all(promiseDone);
	}, 0);
}

export function findChildNodeDepths(nodeData) {
	const previousVisited = [[]];
	const nodeDepths = new Map();
	nodeDepths.set(nodeData, 0);
	const nodesToVisit = [nodeData];
	let maxDepth = 0;

	while (nodesToVisit.length > 0) {
		const currentNode = nodesToVisit.pop();
		const currentPrevious = previousVisited.pop();
		const currentNodeDepth = nodeDepths.get(currentNode);

		// Cycle detection
		if (currentPrevious.includes(currentNode)) return null;
		currentPrevious.push(currentNode);

		Object.keys(currentNode.outConnections).forEach((outConnectorIdentifier) => {
			const connector = currentNode.outConnections[outConnectorIdentifier];
			const connectionDestinationNodes = connector.map(connection => connection.node);
			connectionDestinationNodes.forEach((node) => {
				const existingDepth = nodeDepths.get(node) || 0;
				const depth = Math.max(existingDepth, currentNodeDepth + 1);
				maxDepth = Math.max(maxDepth, depth);
				nodeDepths.set(node, depth);
				// if (!nodesToVisit.includes(node)) // Untested potential optimization
				nodesToVisit.push(node);

				previousVisited.push(currentPrevious.map((x) => x));
			});
		});
	}

	const nodeGroupsAtDepths = Array(maxDepth + 1).fill(null).map(() => []);
	nodeDepths.forEach((depth, node) => {
		nodeGroupsAtDepths[depth].push(node);
	});

	return nodeGroupsAtDepths;
}
