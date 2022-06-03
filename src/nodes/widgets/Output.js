export function getPropertyValue(nodeData, identifier, definition) {
	return null;
}

export function createWidget(nodeData, row) {
	const outputElement = document.createElement("label");
	outputElement.innerHTML = row.options.label;
	return outputElement;
}

export function propertyValueWasUpdated(nodeData, row) {
	// const identifier = row.options.outputBoundIdentifier;
	// const image = Node.getInPropertyValue(nodeData, identifier);

	// ViewportShader.updateImage(row.options.textureUniformName, image);
}
