import * as Node from "@/Node.js";
import SampleInput from "@/data/sample-input.json";

let pressureStrip;
let altitudeStrip;
let progradeStrip;

export function getDefinition() {
	const definition = {
		// Defines the node name shown in its header
		name: "Input",
		// Defines input and output data model properties
		properties: [
			{
				identifier: "pressure",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
			{
				identifier: "altitude",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
			{
				identifier: "prograde",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
		],
		// Defines GUI layout information and its bindings to the data model
		rows: [
			{ name: "pressure_label", type: "Label", options: { label: "Pressure:" } },
			{
				// Unique identifier for this row in the node definition
				name: "pressure_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "pressure", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "pressure",
				},
			},

			{ type: "Spacer" },
			{ name: "altitude_label", type: "Label", options: { label: "Altitude:" } },
			{
				// Unique identifier for this row in the node definition
				name: "altitude_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "altitude", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "altitude",
				},
			},

			{ type: "Spacer" },
			{ name: "prograde_label", type: "Label", options: { label: "Prograde Tilt:" } },
			{
				// Unique identifier for this row in the node definition
				name: "prograde_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "prograde", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "prograde",
				},
			},
		],
	};

	return definition;
}

export function setup() {
	const resolution = Node.formFactorResolutions["Strip"];

	let foo = [];
	const progradeSamples = SampleInput.azimuth.map((azimuthSample, i) => {
		const xSamplePrev = i === 0 ? SampleInput.x[0] : SampleInput.x[i - 1];
		const ySamplePrev = i === 0 ? SampleInput.y[0] : SampleInput.y[i - 1];
		const xSample = SampleInput.x[i];
		const ySample = SampleInput.y[i];
		const deltaX = xSample - xSamplePrev;
		const deltaY = ySample - ySamplePrev;
		const xyLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
		const xyVector = [deltaX / xyLength || 0, deltaY / xyLength || 0];

		const azimuthVector = [Math.cos(azimuthSample), Math.sin(azimuthSample)];

		const dotProduct = xyVector[0] * azimuthVector[0] + xyVector[1] * azimuthVector[1];
		const angle = Math.acos(dotProduct);

		const result = angle / Math.PI;
		foo.push(result);
		return result;
	});
	console.log(foo);

	pressureStrip = makeStripTexture(resolution, SampleInput.pressure);
	altitudeStrip = makeStripTexture(resolution, SampleInput.altitude, Math.PI / 2); // 0 (parallel to surface) to π/2 (normal to surface)
	progradeStrip = makeStripTexture(resolution, progradeSamples); // 0.5 is prograde, 0 and 1 are retrograde, 0.25 and 0.75 are perpendicular in either direction
}

export function compute(nodeData) {
	Node.setPropertyValue(nodeData, "pressure", pressureStrip);
	Node.setPropertyValue(nodeData, "altitude", altitudeStrip);
	Node.setPropertyValue(nodeData, "prograde", progradeStrip);
}

function makeStripTexture(resolution, data, range = 1) {
	const [width, height] = resolution;

	const smallCanvas = document.createElement("canvas");
	const smallContext = smallCanvas.getContext("2d");
	smallCanvas.width = data.length;
	smallCanvas.height = 1;

	const pixelValues = data.flatMap((floatingValue) => {
		const value = Math.round(floatingValue * 255 / range);
		return [value, value, value, 255];
	});
	const dataArray = new Uint8ClampedArray(pixelValues);
	const imageData = new ImageData(dataArray, data.length, 1);
	smallContext.putImageData(imageData, 0, 0, 0, 0, width, height);

	const bigCanvas = document.createElement("canvas");
	const bigContext = bigCanvas.getContext("2d");
	bigCanvas.width = width;
	bigCanvas.height = height;

	bigContext.drawImage(smallCanvas, 0, 0, width, height);

	const readData = bigContext.getImageData(0, 0, width, height);
	const pixelData = new Uint8Array(readData.data);
	return { resolution, pixelData };
}
