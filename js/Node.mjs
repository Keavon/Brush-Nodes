import { renderThumbnail } from "./Rendering.mjs";

export function getEmptyConnectionsMap(blueprint, direction) {
	const properties = blueprint.properties.filter(property => property.direction === direction);
	const connectionsMap = {};
	properties.forEach((property) => {
		connectionsMap[property.identifier] = [];
	});
	return connectionsMap;
}

export function getDefaultInValuesMap(blueprint) {
	const properties = blueprint.properties.filter(property => property.direction === "in");
	const valuesMap = {};
	properties.forEach((property) => {
		valuesMap[property.identifier] = "default" in property.constraints ? property.constraints.default : null;
	});
	return valuesMap;
}

export function getNullOutValuesMap(blueprint) {
	const properties = blueprint.properties.filter(property => property.direction === "out");
	const valuesMap = {};
	properties.forEach((property) => {
		valuesMap[property.identifier] = null;
	});
	return valuesMap;
}

export function constructNode(blueprint, xDestination, yDestination, startSelected) {
	const nodeData = {
		name: blueprint.name,
		blueprint: blueprint,
		element: null,
		inConnections: getEmptyConnectionsMap(blueprint, "in"),
		outConnections: getEmptyConnectionsMap(blueprint, "out"),
		inValues: getDefaultInValuesMap(blueprint),
		outValues: getNullOutValuesMap(blueprint),
		selected: startSelected,
		x: xDestination,
		y: yDestination,
	};
	nodeData.element = createNodeElement(nodeData);

	return nodeData;
}

export function createNodeElement(nodeData) {
	// Create the node container element
	const nodeElement = document.createElement("section");

	// Give it a title element
	const titleElement = document.createElement("h1");
	titleElement.innerHTML = nodeData.blueprint.name;
	nodeElement.appendChild(titleElement);

	// Give it all the specified rows
	nodeData.blueprint.rows.forEach((row) => appendRow(row, nodeData, nodeElement));
	
	// Append the node element to the DOM
	document.body.appendChild(nodeElement);
	return nodeElement;
}

function appendRow(row, nodeData, nodeElement) {
	// Create property row
	const rowElement = document.createElement("div");
	rowElement.classList.add("row", row.display);

	// Add in connectors
	appendConnectors(row, rowElement, "in");

	switch (row.display) {
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

			if (row.display === "input") {
				const inputElement = document.createElement("input");
				inputElement.value = getRowCurrentValue(row, nodeData);
				labelElement.appendChild(inputElement);
			}

			if (row.display === "dropdown") {
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

			const colonElement = document.createElement("colon");
			labelElement.appendChild(colonElement);
	
			rowElement.appendChild(labelElement);
			break;
		}
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

		// Add it to the row
		rowElement.appendChild(connectorElement);
	});

	// Update the row class to associate the row with it containing an in or out connector
	if (connectorsList.length >= 1) rowElement.classList.add(direction);
}

function getRowCurrentValue(row, nodeData) {
	const boundProperty = row.options.inputBoundIdentifier;
	return nodeData.inValues[boundProperty];
}