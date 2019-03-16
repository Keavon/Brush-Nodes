export function getPropertyValue(nodeData, identifier, definition) {
	const row = definition.rows.find(row => row.options.outputBoundIdentifier === identifier);
	return nodeData.rowStateData[row.name];
}