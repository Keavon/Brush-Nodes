import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import LevelsFrag from "@/shaders/Levels.frag.glsl";

let program;
let gl;

const definition = {
	name: "Levels",
	properties: [
		{
			identifier: "input_texture",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "shadows",
			direction: "in",
			dimensions: "2d",
			type: "color",
			default: 0.0,
			constraints: { min: 0, max: 1 }
		},
		{
			identifier: "midtones",
			direction: "in",
			dimensions: "2d",
			type: "color",
			default: 0.5,
			constraints: { min: 0, max: 1 }
		},
		{
			identifier: "highlights",
			direction: "in",
			dimensions: "2d",
			type: "color",
			default: 1.0,
			constraints: { min: 0, max: 1 }
		},
		{
			identifier: "minimums",
			direction: "in",
			dimensions: "2d",
			type: "color",
			default: 0.0,
			constraints: { min: 0, max: 1 }
		},
		{
			identifier: "maximums",
			direction: "in",
			dimensions: "2d",
			type: "color",
			default: 1.0,
			constraints: { min: 0, max: 1 }
		},
		{
			identifier: "output_texture",
			direction: "out",
			dimensions: "2d",
			type: "color",
		},
	],
	rows: [
		{
			name: "output_thumbnail",
			type: "Thumbnail",
			connectors: [
				{ identifier: "input_texture", direction: "in", dimensions: "2d", type: "color" },
				{ identifier: "output_texture", direction: "out", dimensions: "2d", type: "color" },
			],
			options: {
				outputBoundIdentifier: "output_texture",
			},
		},
		{ type: "Spacer" },
		{
			name: "input_shadows",
			type: "Input",
			connectors: [],
			options: {
				label: "Shadows",
				inputBoundIdentifier: "shadows",
			},
			data: {},
		},
		{
			name: "input_midtones",
			type: "Input",
			connectors: [],
			options: {
				label: "Midtones (Interp Factor)",
				inputBoundIdentifier: "midtones",
			},
			data: {},
		},
		{
			name: "input_highlights",
			type: "Input",
			connectors: [],
			options: {
				label: "Highlights",
				inputBoundIdentifier: "highlights",
			},
			data: {},
		},
		{ type: "Spacer" },
		{
			name: "output_minimums",
			type: "Input",
			connectors: [],
			options: {
				label: "Minimums",
				inputBoundIdentifier: "minimums",
			},
			data: {},
		},
		{
			name: "output_maximums",
			type: "Input",
			connectors: [],
			options: {
				label: "Maximums",
				inputBoundIdentifier: "maximums",
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

	program = Shader.createProgram(gl, BillboardVert, LevelsFrag);
}

export function compute(nodeData) {
	const inputTexture = nodeData.inConnections.input_texture[0];
	const inputTextureIdentifier = inputTexture?.identifier;
	const inputTextureResolution = inputTexture?.node.propertyValues[inputTextureIdentifier]?.resolution;
	const inputTextureFF = inputTextureResolution ? Node.formFactorFromResolution(inputTextureResolution) : Node.formFactorList[0];

	// Set up render data
	const resolution = Node.formFactorResolutions[inputTextureFF];
	const uniforms = {
		u_shadows: { value: Node.getInPropertyValue(nodeData, "shadows"), type: "float", vector: false, location: null },
		u_midtones: { value: Node.getInPropertyValue(nodeData, "midtones"), type: "float", vector: false, location: null },
		u_highlights: { value: Node.getInPropertyValue(nodeData, "highlights"), type: "float", vector: false, location: null },
		u_minimums: { value: Node.getInPropertyValue(nodeData, "minimums"), type: "float", vector: false, location: null },
		u_maximums: { value: Node.getInPropertyValue(nodeData, "maximums"), type: "float", vector: false, location: null },
	};
	const textures = {
		u_input: { value: Node.getInPropertyValue(nodeData, "input_texture"), location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms, textures); // TODO: Should only be called once
	const framebuffer = NodeShader.renderToTexture(gl, resolution);
	NodeShader.composite(gl, uniforms, textures);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "output_texture", image);
}
