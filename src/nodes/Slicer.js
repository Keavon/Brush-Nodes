import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import SlicerFrag from "@/shaders/Slicer.frag.glsl";

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
			dimensions: "2d",
			type: "color",
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
				{ identifier: "streak", direction: "out", dimensions: "2d", type: "color" },
			],
			options: {
				outputBoundIdentifier: "streak",
			},
		},
		{ type: "Spacer" },
		{
			name: "sliceable_texture",
			type: "Label",
			connectors: [
				{ identifier: "sliceable", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Sliceable",
				inputBoundIdentifier: "sliceable",
			},
			data: {},
		},
		{
			name: "depth_values",
			type: "Label",
			connectors: [
				{ identifier: "depth", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Slice Column Depth",
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

	program = Shader.createProgram(gl, BillboardVert, SlicerFrag);
}

export function compute(nodeData) {
	// Set up render data
	const resolution = Node.STRIP_RESOLUTION;
	// TODO: Reenable retrieval from the node socket when we can encode large arrays as textures instead of uniforms
	// const timeSeriesData = Node.getInPropertyValue(nodeData, "depth")
	// const timeSeriesData = Array(resolution[0]).fill(0).map((_, i) => 1 - (Math.cos((i / resolution[0]) * Math.PI * 2) + 1) / 2);
	const uniforms = {
		// u_depth: { value: timeSeriesData, type: "float", array1: true, location: null },
	};
	const textures = {
		u_sliceable: { value: Node.getInPropertyValue(nodeData, "sliceable"), location: null },
		u_depth_bit_texture: { value: Node.getInPropertyValue(nodeData, "depth"), location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms, textures); // TODO: Should only be called once
	const framebuffer = NodeShader.renderToTexture(gl, resolution);
	NodeShader.composite(gl, uniforms, textures);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "streak", image);
}
