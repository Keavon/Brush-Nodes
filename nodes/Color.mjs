import * as Node from "/Materialism/js/Node.mjs";
import * as Shader from "/Materialism/js/Shader.mjs";
import * as NodeShader from "/Materialism/js/NodeShader.mjs";

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
			connectors: [
				{ identifier: "rgba", direction: "in", dimensions: "0d", type: "string" },
			],
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

export async function setup() {
	// Create one WebGl context for this node definition
	gl = NodeShader.createGLContext();

	program = Shader.createProgram(gl, "Billboard.vert.glsl", "Color.frag.glsl");
	return program;
}

export async function compute(nodeData) {
	// Set up render data
	const resolution = [512, 512];
	const uniforms = {
		u_color: { value: hexToArray(Node.getInPropertyValue(nodeData, "rgba")), type: "float", vector: true, location: null },
	};

	NodeShader.initializeProgram(gl, await program, resolution, uniforms);
	const framebuffer = NodeShader.renderToTexture(gl, await program, resolution, uniforms);
	NodeShader.composite(gl, await program, resolution, uniforms);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "composite", image);
}

function hexToArray(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}
