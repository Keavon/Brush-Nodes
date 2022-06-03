import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import ColorFrag from "@/shaders/Color.frag.glsl";

let program;
let gl;

const definition = {
	name: "Color",
	properties: [
		{
			identifier: "rgba",
			direction: "in",
			dimensions: "0d",
			type: "string",
			constraints: {},
		},
		{
			identifier: "plate",
			direction: "out",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
	],
	rows: [
		{
			name: "composite_thumbnail",
			type: "Thumbnail",
			connectors: [
				{ identifier: "plate", direction: "out", dimensions: "2d", type: "color" },
			],
			options: {
				outputBoundIdentifier: "plate",
			},
		},
		{ type: "Spacer" },
		{
			name: "color_picker",
			type: "Input",
			connectors: [],
			options: {
				label: "Color",
				inputBoundIdentifier: "rgba",
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

	program = Shader.createProgram(gl, BillboardVert, ColorFrag);
}

export function compute(nodeData) {
	// Set up render data
	const resolution = [512, 512];
	const uniforms = {
		u_color: { value: hexToArray(Node.getInPropertyValue(nodeData, "rgba")), type: "float", vector: true, location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms);
	const framebuffer = NodeShader.renderToTexture(gl, program, resolution, uniforms);
	NodeShader.composite(gl, program, resolution, uniforms);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "composite", image);
}

function hexToArray(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}
