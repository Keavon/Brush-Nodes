import * as Node from "/Materialism/js/Node.mjs";
import * as Shader from "/Materialism/js/Shader.mjs";
import * as NodeShader from "/Materialism/js/NodeShader.mjs";

let program;
let gl;

const styleList = ["Linear Horizontal", "Linear Vertical", "Bookmatched X", "Bookmatched Y", "Radial"];

const definition = {
	// Defines the node name shown in its header
	name: "Gradient",
	// Defines input and output data model properties
	properties: [
		{
			identifier: "style",
			direction: "in",
			dimensions: "0d",
			type: "string",
			default: "Linear Horizontal",
			constraints: {},
		},
		{
			identifier: "falloff",
			direction: "in",
			dimensions: "0d",
			type: "float",
			default: 1,
			constraints: { min: 0, max: 1 },
		},
		{
			identifier: "thickness",
			direction: "in",
			dimensions: "0d",
			type: "float",
			default: 1,
			constraints: { min: 0, max: 1 },
		},
		{
			identifier: "radius",
			direction: "in",
			dimensions: "0d",
			type: "float",
			default: 1,
			constraints: { min: 0 },
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
			name: "style",
			type: "Dropdown",
			connectors: [],
			options: {
				label: "Style",
				inputBoundIdentifier: "style",
			},
			data: {
				options: styleList,
			},
		},
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
			name: "gradient_thickness",
			type: "Input",
			connectors: [
				{ identifier: "thickness", direction: "in", dimensions: "0d", type: "float" },
			],
			options: {
				label: "Thickness",
				inputBoundIdentifier: "thickness",
			},
			data: {},
		},
		{
			name: "gradient_radius",
			type: "Input",
			connectors: [
				{ identifier: "radius", direction: "in", dimensions: "0d", type: "float" },
			],
			options: {
				label: "Outer Radius",
				inputBoundIdentifier: "radius",
			},
			data: {},
		},
	],
};

export function getDefinition() {
	return definition;
}

export async function setup() {
	// Create one WebGl context for this node definition
	gl = NodeShader.createGLContext();

	program = await Shader.createProgram(gl, "Billboard.vert.glsl", "Gradient.frag.glsl");
}

export async function compute(nodeData) {
	// Prepare new render data
	const resolution = [512, 512];
	const uniforms = {
		u_style: { value: styleList.indexOf(Node.getInPropertyValue(nodeData, "style")), type: "int", vector: false, location: null },
		u_falloff: { value: Node.getInPropertyValue(nodeData, "falloff"), type: "float", vector: false, location: null },
		u_thickness: { value: Node.getInPropertyValue(nodeData, "thickness"), type: "float", vector: false, location: null },
		u_radius: { value: Node.getInPropertyValue(nodeData, "radius"), type: "float", vector: false, location: null },
	};

	NodeShader.initializeProgram(gl, await program, resolution, uniforms);
	const framebuffer = NodeShader.renderToTexture(gl, await program, resolution, uniforms);
	NodeShader.composite(gl, await program, resolution, uniforms);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "gradient", image);
}
