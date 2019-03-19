import * as Node_PerlinNoise from "../nodes/PerlinNoise.mjs";
import * as Node_Blend from "../nodes/Blend.mjs";
const nodes = {
	"Perlin Noise": Node_PerlinNoise,
	"Blend": Node_Blend,
};

import * as Widget_Spacer from "../nodes/widgets/Spacer.mjs";
import * as Widget_Thumbnail from "../nodes/widgets/Thumbnail.mjs";
import * as Widget_Label from "../nodes/widgets/Label.mjs";
import * as Widget_Input from "../nodes/widgets/Input.mjs";
import * as Widget_Dropdown from "../nodes/widgets/Dropdown.mjs";
const widgets = {
	"Spacer": Widget_Spacer,
	"Thumbnail": Widget_Thumbnail,
	"Label": Widget_Label,
	"Input": Widget_Input,
	"Dropdown": Widget_Dropdown,
};

export function createNode(node, xPlacement, yPlacement, startSelected) {
	const definition = nodes[node].getDefinition();
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
	nodeData.element = createNodeElement(nodeData, definition);
	if (startSelected) createNodeOutlineElement(nodeData);
	updateRowDataToPropertyValues(nodeData, definition);
	recomputeProperties(nodeData, false);

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
	document.body.appendChild(nodeElement);
	return nodeElement;
}

function createRow(row, nodeData, definition) {
	// Create property row
	const rowElement = document.createElement("div");
	rowElement.classList.add("row");

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

	// Find if there is a widget which is defined as being bound to this output
	const rows = nodes[nodeData.name].getDefinition().rows;
	const outputBoundRow = rows.find(row => row.options && row.options.outputBoundIdentifier === identifier);
	if (!outputBoundRow) return;

	const widgetToNotify = widgets[outputBoundRow.type];
	if (!widgetToNotify) return;

	if (!widgetToNotify.propertyValueWasUpdated) return;	
	widgetToNotify.propertyValueWasUpdated(nodeData, outputBoundRow)
}

export function recomputeProperties(nodeData, recomputeGraphDownstream) {
	if (recomputeGraphDownstream) {
		const depthGroups = findChildNodeDepths(nodeData);
		depthGroups.forEach((depthGroup) => {
			depthGroup.forEach((node) => {
				recomputeProperties(node, false);
			});
		});

		return;
	}

	if (nodes[nodeData.name].compute) nodes[nodeData.name].compute(nodeData);
	else console.error(`${nodeData.name} node has no compute() function implementation.`);
}

export function findChildNodeDepths(nodeData, outConnectorsToTraverse) {
	// const allVisitedNodes = [];
	const nodeDepths = new Map();
	nodeDepths.set(nodeData, 0);
	const nodesToVisit = [nodeData];
	let maxDepth = 0;

	// Object.keys(outConnectorsToTraverse).forEach((outConnectorIdentifier) => {
	// 	const connector = outConnectorsToTraverse[outConnectorIdentifier];
	// 	const connectionDestinationNodes = connector.map(connection => connection.node);
	// 	connectionDestinationNodes.forEach((node) => {
	// 		nodeGroupsAtDepths[1].push(node);
	// 		nodeDepths.set(node, 1);
	// 		if (!nodesToVisit.includes(node)) nodesToVisit.push(node);
	// 	});
	// });

	while (nodesToVisit.length > 0) {
		const currentNode = nodesToVisit.pop();
		const currentNodeDepth = nodeDepths.get(currentNode);

		// Cycle detection
		// if (allVisitedNodes.includes(currentNode)) return null;
		// allVisitedNodes.push(currentNode);
		// const potentialCycle = nodeDepths.get(currentNode);
		// if (potentialCycle !== undefined && potentialCycle) return null;

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
			});
		});
	}

	const nodeGroupsAtDepths = Array(maxDepth + 1).fill(null).map(() => []);
	nodeDepths.forEach((depth, node) => {
		nodeGroupsAtDepths[depth].push(node);
	});

	return nodeGroupsAtDepths;
}