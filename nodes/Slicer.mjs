import * as Node from "/Materialism/js/Node.mjs";
import * as Shader from "/Materialism/js/Shader.mjs";
import * as NodeShader from "/Materialism/js/NodeShader.mjs";

let program;
let gl;

const definition = {
	name: "Slicer",
	properties: [
		{
			identifier: "sliceable",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "depth",
			direction: "in",
			dimensions: "1d",
			type: "float",
			default: 0.0,
			constraints: {}
		},
		{
			identifier: "streak",
			direction: "out",
			dimensions: "2d",
			type: "color",
		},
	],
	rows: [
		{
			name: "streak_thumbnail",
			type: "Thumbnail",
			connectors: [
				{ identifier: "sliceable", direction: "in", dimensions: "2d", type: "color" },
				{ identifier: "streak", direction: "out", dimensions: "2d", type: "color" },
			],
			options: {
				outputBoundIdentifier: "streak",
			},
		},
		{ type: "Spacer" },
		{
			name: "slice_depth",
			type: "Input",
			connectors: [
				{ identifier: "depth", direction: "in", dimensions: "1d", type: "float" },
			],
			options: {
				label: "Depth",
				inputBoundIdentifier: "depth",
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

	const loadingProgram = Shader.createProgram(gl, "Billboard.vert.glsl", "Slicer.frag.glsl");
	loadingProgram.then((createdProgram) => {
		program = createdProgram;
	});
	return loadingProgram;
}

export function compute(nodeData) {
	// Set up render data
	const resolution = [1024, 128];
	// TODO: Reenable retrieval from the node socket when we can encode large arrays as textures instead of uniforms
	// const timeSeriesData = Node.getInPropertyValue(nodeData, "depth")
	const timeSeriesData = Array(resolution[0]).fill(0).map((_, i) => 1 - (Math.cos((i / resolution[0]) * Math.PI * 2) + 1) / 2);
	const uniforms = {
		u_depth: { value: timeSeriesData, type: "float", array1: true, location: null },
	};
	const textures = {
		u_sliceable: { value: Node.getInPropertyValue(nodeData, "sliceable"), location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms, textures); // TODO: Should only be called once
	const framebuffer = NodeShader.renderToTexture(gl, program, resolution, uniforms);
	NodeShader.composite(gl, program, resolution, uniforms, textures);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "streak", image);
}
