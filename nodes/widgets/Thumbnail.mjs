import * as Node from "../../js/Node.mjs";
import * as NodeShader from "../../js/NodeShader.mjs";

export function getPropertyValue(nodeData, identifier, definition) {
	return null;
}

export function createWidget(nodeData, row) {
	const canvasElement = document.createElement("canvas");
	canvasElement.classList.add("thumbnail");
	return canvasElement;
}

export function propertyValueWasUpdated(nodeData, row) {
	const identifier = row.options.outputBoundIdentifier;
	const image = nodeData.propertyValues[identifier];

	const canvas = nodeData.element.querySelector("canvas");
	const context = canvas.getContext("2d");
	canvas.width = image.resolution[0];
	canvas.height = image.resolution[1];

	const imageData = context.createImageData(image.resolution[0], image.resolution[1]);
	imageData.data.set(image.pixelData);
	context.putImageData(imageData, 0, 0);
}
