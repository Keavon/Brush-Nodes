export function getPropertyValue(nodeData, identifier, definition) {
	return null;
}

export function createWidget(nodeData, row) {
	const identifier = row.options.outputBoundIdentifier;

	const canvasElement = document.createElement("canvas");
	canvasElement.classList.add("thumbnail");
	canvasElement.dataset.identifier = identifier;
	return canvasElement;
}

export function propertyValueWasUpdated(nodeData, row) {
	const identifier = row.options.outputBoundIdentifier;
	const image = nodeData.propertyValues[identifier];

	let context;
	if (nodeData.name === "Output") {
		const canvas = document.querySelector(".viewport-3d canvas");
		context = canvas.getContext("2d");
		canvas.width = image.resolution[0];
		canvas.height = image.resolution[1];
	}
	else {
		const canvas = nodeData.element.querySelector(`canvas[data-identifier=${identifier}]`);
		context = canvas.getContext("2d");
		canvas.width = image.resolution[0];
		canvas.height = image.resolution[1];
	}

	const imageData = context.createImageData(image.resolution[0], image.resolution[1]);
	imageData.data.set(image.pixelData);
	context.putImageData(imageData, 0, 0);
}
