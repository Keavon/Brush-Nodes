import * as Node from "/Materialism/js/Node.mjs";

export function getPropertyValue(nodeData, identifier, definition) {
	const row = definition.rows.find(row => row.options && row.options.inputBoundIdentifier === identifier);
	return nodeData.rowData[row.name];
}

export function createWidget(nodeData, row, definition) {
	let value = nodeData.rowData[row.name].inputValue;
	if (value === undefined) {
		const property = definition.properties.find(property => property.identifier === row.options.inputBoundIdentifier);
		value = property.default;
		nodeData.rowData[row.name].inputValue = value;
	}

	const labelElement = document.createElement("label");
	labelElement.innerHTML = row.options.label;

	const inputElement = document.createElement("input");
	inputElement.type = "number";
	inputElement.value = value;
	inputElement.addEventListener("input", event => inputChangeHandler(event, nodeData, row, false));
	inputElement.addEventListener("change", event => inputChangeHandler(event, nodeData, row, true));
	
	labelElement.appendChild(inputElement);
	return labelElement;
}

export function updateElementDisplayValue(nodeData, row) {
	const rowElement = nodeData.element.querySelector(`.row[data-name="${row.name}"]`);
	rowElement.querySelector("input").value = row.data.inputValue;
}

export function resetRowDataToPropertyValue(nodeData, rowData, rowDefinition) {
	const identifier = rowDefinition.options.inputBoundIdentifier;
	const value = nodeData.propertyValues[identifier];
	rowData.inputValue = value;
}

function inputChangeHandler(event, nodeData, row, recomputeGraphDownstream) {
	const newValue = validate(event.target.value);
	
	// Update the row's widget state data
	const savedRowData = nodeData.rowData[row.name];
	savedRowData.inputValue = newValue;

	// Update the current property value
	const propertyIdentifier = row.options.inputBoundIdentifier;
	Node.setPropertyValue(nodeData, propertyIdentifier, newValue)

	// Recompute this node with the new input
	Node.recomputeProperties(nodeData);
	
	// If the user is finished tweaking this input, recompute the whole downstream graph
	if (recomputeGraphDownstream) Node.recomputeDownstreamNodes(nodeData);
}

function validate(value) {
	return Number(value);
}
