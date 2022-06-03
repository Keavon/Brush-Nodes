import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import PerlinNoiseFrag from "@/shaders/PerlinNoise.frag.glsl";

let program;
let gl;

export function getDefinition() {
	const definition = {
		// Defines the node name shown in its header
		name: "Perlin Noise",
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
				identifier: "scale",
				direction: "in",
				dimensions: "0d",
				type: "float",
				default: 10,
				constraints: { min: 1 },
			},
			{
				identifier: "seed",
				direction: "in",
				dimensions: "0d",
				type: "int",
				default: 0,
				constraints: {},
			},
			{
				identifier: "pattern",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
		],
		// Defines GUI layout information and its bindings to the data model
		rows: [
			{
				// Unique identifier for this row in the node definition
				name: "perlin_noise_thumbnail",
				// The widget type for the row to be rendered as
				type: "Thumbnail",
				// List of any connector dots hosted on the input and output sides of the row
				connectors: [
					{ identifier: "pattern", direction: "out", dimensions: "2d", type: "color" },
				],
				// Option specific to the widget type
				options: {
					// Tells the thumbnail which output property identifier read its value from to display
					outputBoundIdentifier: "pattern",
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
				name: "perlin_noise_scale",
				type: "Input",
				options: {
					// Tells the input what label to print
					label: "Scale",
					// Tells the input what in property identifier feed with its value
					inputBoundIdentifier: "scale",
				},
				connectors: [],
				data: {},
			},
			{
				name: "random_seed",
				type: "Input",
				connectors: [],
				options: {
					label: "Seed",
					inputBoundIdentifier: "seed",
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

	program = Shader.createProgram(gl, BillboardVert, PerlinNoiseFrag);
}

export function compute(nodeData) {
	// Prepare new render data
	const ff = Node.getInPropertyValue(nodeData, "form_factor");
	const resolution = Node.formFactorResolutions[ff];
	const uniforms = {
		u_scale: { value: Node.getInPropertyValue(nodeData, "scale"), type: "float", vector: false, location: null },
		u_seed: { value: Node.getInPropertyValue(nodeData, "seed"), type: "int", vector: false, location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms);
	const framebuffer = NodeShader.renderToTexture(gl, program, resolution, uniforms);
	NodeShader.composite(gl, program, resolution, uniforms);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "pattern", image);
}
