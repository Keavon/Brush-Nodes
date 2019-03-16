import { renderThumbnail } from "./Rendering.mjs";

import * as Node_PerlinNoise from "../nodes/PerlinNoise.mjs";
import * as Node_Blend from "../nodes/Blend.mjs";
const nodes = {
	"Perlin Noise": Node_PerlinNoise,
	"Blend": Node_Blend,
};

import * as Widget_Input from "../nodes/widgets/Input.mjs";
const widgets = {
	"input": Widget_Input,
};

export function createNode(node, xPlacement, yPlacement, startSelected) {
	const definition = nodes[node].getDefinition();
	const nodeData = {
		name: definition.name,
		element: undefined,
		selected: null,
		inConnections: buildEmptyConnectionsMap(definition, "in"),
		outConnections: buildEmptyConnectionsMap(definition, "out"),
		rowStateData: buildRowDataMap(definition),
		propertyValues: undefined,
		x: xPlacement,
		y: yPlacement,
		inValues: buildDefaultInValuesMap(definition),
		outValues: buildNullOutValuesMap(definition),
	};
	nodeData.element = createNodeElement(nodeData, definition);
	if (startSelected) createNodeOutlineElement(nodeData);
	nodeData.propertyValues = computeProperties(nodeData, definition);

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
	const rows = definition.rows;
	const rowsMap = {};
	rows.forEach((row) => {
		rowsMap[row.name] = row.data || {};
	});
	return rowsMap;
}

function buildDefaultInValuesMap(definition) {
	const properties = definition.properties.filter(property => property.direction === "in");
	const valuesMap = {};
	properties.forEach((property) => {
		valuesMap[property.identifier] = "default" in property.constraints ? property.constraints.default : null;
	});
	return valuesMap;
}

function buildNullOutValuesMap(definition) {
	const properties = definition.properties.filter(property => property.direction === "out");
	const valuesMap = {};
	properties.forEach((property) => {
		valuesMap[property.identifier] = null;
	});
	return valuesMap;
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
	definition.rows.forEach((row) => appendRow(row, nodeData, nodeElement));
	
	// Append the node element to the DOM
	document.body.appendChild(nodeElement);
	return nodeElement;
}

function appendRow(row, nodeData, nodeElement) {
	// Create property row
	const rowElement = document.createElement("div");
	rowElement.classList.add("row", row.type);

	// Add in connectors
	appendConnectors(row, rowElement, "in");

	switch (row.type) {
		case "thumbnail": {
			const canvasElement = document.createElement("canvas");
			rowElement.appendChild(canvasElement);
			renderThumbnail(canvasElement);
			break;
		}
		case "label":
		case "input":
		case "dropdown": {
			const labelElement = document.createElement("label");
			labelElement.innerHTML = row.options.label;

			if (row.type === "input") {
				const inputElement = document.createElement("input");
				inputElement.value = getRowCurrentValue(row, nodeData);
				labelElement.appendChild(inputElement);
			}

			if (row.type === "dropdown") {
				labelElement.innerHTML = "";
				const dropdownElement = document.createElement("select");

				["Normal", "Multiply", "Screen", "Overlay"].forEach((optionText) => {
					const optionElement = document.createElement("option");
					if (optionText === getRowCurrentValue(row, nodeData)) optionElement.setAttributeNode(document.createAttribute("selected"));
					optionElement.innerHTML = optionText;
					dropdownElement.appendChild(optionElement);
				});

				labelElement.appendChild(dropdownElement);
			}
	
			rowElement.appendChild(labelElement);
			break;
		}
		default: console.log(`Trying to append a row of type ${row.type} which is not supported.`);
	}

	// Add out connectors
	appendConnectors(row, rowElement, "out");

	// Add property row to node
	nodeElement.appendChild(rowElement);
}

function appendConnectors(row, rowElement, direction) {
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

// TODO: Replace this with the function after this one
function getRowCurrentValue(row, nodeData) {
	const boundProperty = row.options.inputBoundIdentifier;
	return nodeData.inValues[boundProperty];
}

function getInPropertyValue(nodeData, identifier) {
	// Return the out value from the property's connected source node, if connected
	const connection = nodeData.inConnections[identifier][0];
	if (connection) return getOutPropertyValue(connection.node, identifier);

	// Otherwise, return the value from this node's widget bound to the property
	const definition = nodes[nodeData.name].getDefinition();
	const rowType = definition.rows.find(row => row.options.outputBoundIdentifier === identifier).type;
	return widgets[rowType].getPropertyValue(nodeData, identifier, definition);
}

function computeProperties(nodeData, definition) {

}