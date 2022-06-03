import * as Node from "@/Node.js";

export function getPropertyValue(nodeData, identifier, definition) {
	const row = definition.rows.find(row => row.options && row.options.inputBoundIdentifier === identifier);
	return nodeData.rowData[row.name];
}

export function createWidget(nodeData, row) {
	const labelElement = document.createElement("label");

	const dropdownElement = document.createElement("select");
	dropdownElement.title = row.options.label;
	dropdownElement.addEventListener("input", event => inputChangeHandler(event, nodeData, row, false));
	dropdownElement.addEventListener("change", event => inputChangeHandler(event, nodeData, row, true));

	nodeData.rowData[row.name].options.forEach((optionText) => {
		const optionElement = document.createElement("option");
		optionElement.innerHTML = optionText;
		dropdownElement.appendChild(optionElement);
	});

	labelElement.appendChild(dropdownElement);
	return labelElement;
}

export function updateElementDisplayValue(nodeData, row) {
	const rowElement = nodeData.element.querySelector(`.row[data-name="${row.name}"]`);
	rowElement.querySelector("select").value = row.data.inputValue;
}

export function resetRowDataToPropertyValue(nodeData, rowData, rowDefinition) {
	const identifier = rowDefinition.options.inputBoundIdentifier;
	const value = nodeData.propertyValues[identifier];
	rowData.inputValue = value;
}

function inputChangeHandler(event, nodeData, row, recomputeGraphDownstream) {
	const newValue = event.target.value;

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
