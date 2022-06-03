import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import GradientFrag from "@/shaders/Gradient.frag.glsl";

let program;
let gl;

const styleList = ["Linear Horizontal", "Linear Vertical", "Bookmatched X", "Bookmatched Y", "Radial"];
const invertList = ["Not Inverted", "Inverted"];

export function getDefinition() {
	const definition = {
		// Defines the node name shown in its header
		name: "Gradient",
		// Defines input and output data model properties
		properties: [
			{
				identifier: "form_factor",
				direction: "in",
				dimensions: "0d",
				type: "string",
				default: Node.formFactorList[0],
				constraints: {},
			},
			{
				identifier: "style",
				direction: "in",
				dimensions: "0d",
				type: "string",
				default: "Linear Horizontal",
				constraints: {},
			},
			{
				identifier: "invert",
				direction: "in",
				dimensions: "0d",
				type: "string",
				default: invertList[0],
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
				name: "form_factor",
				type: "Dropdown",
				connectors: [],
				options: {
					label: "Form Factor",
					inputBoundIdentifier: "form_factor",
				},
				data: {
					options: Node.formFactorList,
				},
			},
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
				name: "invert",
				type: "Dropdown",
				connectors: [],
				options: {
					label: "Invert",
					inputBoundIdentifier: "invert",
				},
				data: {
					options: invertList,
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
				connectors: [],
				data: {},
			},
			{
				name: "gradient_thickness",
				type: "Input",
				connectors: [],
				options: {
					label: "Thickness",
					inputBoundIdentifier: "thickness",
				},
				data: {},
			},
			{
				name: "gradient_radius",
				type: "Input",
				connectors: [],
				options: {
					label: "Outer Radius",
					inputBoundIdentifier: "radius",
				},
				data: {},
			},
		],
	};

	return definition;
}

export function setup() {
	// Create one WebGl context for this node definition
	gl = NodeShader.createGLContext();

	program = Shader.createProgram(gl, BillboardVert, GradientFrag);
}

export function compute(nodeData) {
	// Prepare new render data
	const ff = Node.getInPropertyValue(nodeData, "form_factor");
	const resolution = Node.formFactorResolutions[ff];
	const uniforms = {
		u_style: { value: styleList.indexOf(Node.getInPropertyValue(nodeData, "style")), type: "int", vector: false, location: null },
		u_invert: { value: invertList.indexOf(Node.getInPropertyValue(nodeData, "invert")), type: "int", vector: false, location: null },
		u_falloff: { value: Node.getInPropertyValue(nodeData, "falloff"), type: "float", vector: false, location: null },
		u_thickness: { value: Node.getInPropertyValue(nodeData, "thickness"), type: "float", vector: false, location: null },
		u_radius: { value: Node.getInPropertyValue(nodeData, "radius"), type: "float", vector: false, location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms);
	const framebuffer = NodeShader.renderToTexture(gl, resolution);
	NodeShader.composite(gl, uniforms);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "gradient", image);
}
