import * as NodeShader from "../../NodeShader.js";

// Thumbnails display at most ~240 CSS px wide inside a node. Reading at this size keeps the per-thumbnail
// readPixels at ~256 KB instead of 16 MB and avoids reallocating large canvas backbuffers on every recompute.
const THUMBNAIL_MAX_DIMENSION = 256;

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
	if (!image) return;

	const canvas = nodeData.element.querySelector(`canvas[data-identifier=${identifier}]`);
	if (!canvas) return;

	let width;
	let height;
	let pixelData;

	if (image.texture) {
		// GPU-resident output: downsample via a passthrough render then read a tiny region of pixels
		const [thumbnailWidth, thumbnailHeight] = thumbnailSizeFor(image.resolution);
		const gl = NodeShader.createGLContext();
		width = thumbnailWidth;
		height = thumbnailHeight;
		pixelData = NodeShader.readPixelsFromTexture(gl, image.texture, width, height);
	} else if (image.pixelData) {
		width = image.resolution[0];
		height = image.resolution[1];
		pixelData = image.pixelData;
	} else {
		return;
	}

	if (canvas.width !== width) canvas.width = width;
	if (canvas.height !== height) canvas.height = height;

	const context = canvas.getContext("2d");
	const imageData = context.createImageData(width, height);
	imageData.data.set(pixelData);
	context.putImageData(imageData, 0, 0);
}

function thumbnailSizeFor(sourceResolution) {
	const aspectRatio = sourceResolution[0] / sourceResolution[1];
	if (aspectRatio >= 1) {
		const width = Math.min(THUMBNAIL_MAX_DIMENSION, sourceResolution[0]);
		const height = Math.max(1, Math.round(width / aspectRatio));
		return [width, height];
	}
	const height = Math.min(THUMBNAIL_MAX_DIMENSION, sourceResolution[1]);
	const width = Math.max(1, Math.round(height * aspectRatio));
	return [width, height];
}
