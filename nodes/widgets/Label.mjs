import * as Node from "../../js/Node.mjs";

export function getPropertyValue(nodeData, identifier, definition) {
	const row = definition.rows.find(row => row.options.outputBoundIdentifier === identifier);
	return nodeData.rowData[row.name];
}

export function createWidget(nodeData, row) {
	const labelElement = document.createElement("label");
	labelElement.innerHTML = row.options.label;
	return labelElement;
}
