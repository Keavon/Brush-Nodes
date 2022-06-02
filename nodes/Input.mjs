import * as Node from "/Brush-Nodes/js/Node.mjs";
import { sampleInput } from "/Brush-Nodes/sample-input.mjs";
// import * as Shader from "/Brush-Nodes/js/Shader.mjs";
// import * as NodeShader from "/Brush-Nodes/js/NodeShader.mjs";

// let program;
// let gl;

let pressureStrip;
let altitudeStrip;
let azimuthStrip;
let xStrip;
let yStrip;

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
				identifier: "azimuth",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
			{
				identifier: "x",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
			{
				identifier: "y",
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
			{ name: "azimuth_label", type: "Label", options: { label: "Azimuth:" } },
			{
				// Unique identifier for this row in the node definition
				name: "azimuth_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "azimuth", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "azimuth",
				},
			},

			{ type: "Spacer" },
			{ name: "x_label", type: "Label", options: { label: "X:" } },
			{
				// Unique identifier for this row in the node definition
				name: "x_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "x", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "x",
				},
			},

			{ type: "Spacer" },
			{ name: "y_label", type: "Label", options: { label: "Y:" } },
			{
				// Unique identifier for this row in the node definition
				name: "y_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "y", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "y",
				},
			},
		],
	};

	return definition;
}

export async function setup() {
	// Create one WebGl context for this node definition
	// gl = NodeShader.createGLContext();

	// program = await Shader.createProgram(gl, "Billboard.vert.glsl", "Gradient.frag.glsl");

	const resolution = Node.formFactorResolutions["Strip"];

	pressureStrip = makeStripTexture(resolution, sampleInput.pressure);
	altitudeStrip = makeStripTexture(resolution, sampleInput.altitude, Math.PI / 2); // 0 (parallel to surface) to π/2 (normal to surface)
	azimuthStrip = makeStripTexture(resolution, sampleInput.azimuth, Math.PI * 2); // 2π radians clockwise from +x
	xStrip = makeStripTexture(resolution, sampleInput.x);
	yStrip = makeStripTexture(resolution, sampleInput.y);
}

export async function compute(nodeData) {
	// Prepare new render data
	// const uniforms = {};

	// NodeShader.initializeProgram(gl, await program, resolution, uniforms);
	// const framebuffer = NodeShader.renderToTexture(gl, await program, resolution, uniforms);
	// NodeShader.composite(gl, await program, resolution, uniforms);
	// const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "pressure", pressureStrip);
	Node.setPropertyValue(nodeData, "altitude", altitudeStrip);
	Node.setPropertyValue(nodeData, "azimuth", azimuthStrip);
	Node.setPropertyValue(nodeData, "x", xStrip);
	Node.setPropertyValue(nodeData, "y", yStrip);
}

function makeStripTexture(resolution, data, range = 1) {
	const lerp = (a, b, t) => a + (b - a) * t;

	const repeatFactor = Math.ceil(resolution[0] / data.length);

	const dataPackedRow = data.flatMap((_, index) => {
		const interpolatedPixels = Array(repeatFactor * 4);

		for (let i = 0; i < repeatFactor; i++) {
			const interpolated = lerp(data[index], data[index + 1], i / repeatFactor);
			const normalizedRange = interpolated / range;
			const outOf255 = Math.round(normalizedRange * 255);
			interpolatedPixels.push([outOf255, outOf255, outOf255, 255]);
		}

		return interpolatedPixels.flat();
	});
	const dataPacked = Array.from({ length: resolution[1] }, () => dataPackedRow).flat();
	const pixelData = Uint8Array.from(dataPacked);
	return { resolution, pixelData };
}
