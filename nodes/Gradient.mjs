import * as Node from "/Materialism/js/Node.mjs";
import * as Shader from "/Materialism/js/Shader.mjs";
import * as NodeShader from "/Materialism/js/NodeShader.mjs";

let program;
let gl;

const definition = {
	// Defines the node name shown in its header
	name: "Gradient",
	// Defines input and output data model properties
	properties: [
		{
			identifier: "falloff",
			direction: "in",
			dimensions: "0d",
			type: "float",
			default: 1,
			constraints: { min: 0, max: 1 },
		},
		{
			identifier: "distance",
			direction: "in",
			dimensions: "0d",
			type: "float",
			default: 1,
			constraints: { min: 0, max: 1 },
		},
		{
			identifier: "gradient",
			direction: "out",
			dimensions: "2d",
			type: "color",
		},
	],
	// Defines GUI layout information and its bindings to the data model
	rows: [
		{
			// Unique identifier for this row in the node definition
			name: "gradient_thumbnail",
			// The widget type for the row to be rendered as
			type: "Thumbnail",
			// List of any connector dots hosted on the input and output sides of the row
			connectors: [
				{ identifier: "gradient", direction: "out", dimensions: "2d", type: "color" },
			],
			// Option specific to the widget type
			options: {
				// Tells the thumbnail which output property identifier read its value from to display
				outputBoundIdentifier: "gradient",
			},
		},
		{ type: "Spacer" },
		{
			name: "gradient_falloff",
			type: "Input",
			options: {
				// Tells the input what label to print
				label: "Falloff",
				// Tells the input what in property identifier feed with its value
				inputBoundIdentifier: "falloff",
			},
			connectors: [
				{ identifier: "falloff", direction: "in", dimensions: "0d", type: "float" },
			],
			data: {},
		},
		{
			name: "gradient_distance",
			type: "Input",
			connectors: [
				{ identifier: "distance", direction: "in", dimensions: "0d", type: "float" },
			],
			options: {
				label: "Distance",
				inputBoundIdentifier: "distance",
			},
			data: {},
		},
	],
};

export function getDefinition() {
	return definition;
}

export function setup() {
	// Create one WebGl context for this node definition
	gl = NodeShader.createGLContext();

	const loadingProgram = Shader.createProgram(gl, "Billboard.vert.glsl", "Gradient.frag.glsl");
	loadingProgram.then((createdProgram) => {
		program = createdProgram;
	});
	return loadingProgram;
}

export function compute(nodeData) {
	// Prepare new render data
	const resolution = [512, 512];
	const uniforms = {
		u_falloff: { value: Node.getInPropertyValue(nodeData, "falloff"), type: "float", vector: false, location: null },
		u_distance: { value: Node.getInPropertyValue(nodeData, "distance"), type: "float", vector: false, location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms);
	const framebuffer = NodeShader.renderToTexture(gl, program, resolution, uniforms);
	NodeShader.composite(gl, program, resolution, uniforms);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "gradient", image);
}
