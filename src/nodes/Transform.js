import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import BlendFrag from "@/shaders/Transform.frag.glsl";

let program;
let gl;
let gl_tile_type;

const tileMode = ["Mirror Repeat", "Repeat", "Clamp"];
const cornerSample = ["Corner Clamping Enabled", "Corner Clamping Disabled"];

export function getDefinition() {
	const definition = {
		name: "Transform",
		properties: [
			{
				identifier: "foreground",
				direction: "in",
				dimensions: "2d",
				type: "color",
				constraints: {},
			},
			{
				identifier: "tile_mode",
				direction: "in",
				dimensions: "0d",
				type: "string",
				default: 0,
				constraints: {},
			},
			{
				identifier: "scale_x",
				direction: "in",
				dimensions: "0d",
				type: "float",
				default: 1.0,
				constraints: { min: 0.01, max: 16 }
            },
            {
				identifier: "scale_y",
				direction: "in",
				dimensions: "0d",
				type: "float",
				default: 1.0,
				constraints: { min: 0.01, max: 16 }
			},
			{
				identifier: "offset_x",
				direction: "in",
				dimensions: "0d",
				type: "float",
				default: 0.0,
				constraints: { min: 0.01, max: 16 }
			},
			{
				identifier: "offset_y",
				direction: "in",
				dimensions: "0d",
				type: "float",
				default: 0.0,
				constraints: { min: 0.01, max: 16 }
			},
			{
				identifier: "rotation",
				direction: "in",
				dimensions: "0d",
				type: "float",
				default: 0.0,
				constraints: { min: -360, max: 360 }
			},
			{
				identifier: "clamp_rotation_sampling",
				direction: "in",
				dimensions: "0d",
				type: "string",
				default: 0,
				constraints: {}
			},
			{
				identifier: "composite",
				direction: "out",
				dimensions: "2d",
				type: "color",
			},
		],
		rows: [
			{
				name: "composite_thumbnail",
				type: "Thumbnail",
				connectors: [
					{ identifier: "foreground", direction: "in", dimensions: "2d", type: "color" },
					{ identifier: "composite", direction: "out", dimensions: "2d", type: "color" },
				],
				options: {
					outputBoundIdentifier: "composite",
				},
			},
			{ type: "Spacer" },
			{
				name: "tile_mode",
				type: "Dropdown",
				connectors: [],
				options: {
					label: "Tile Mode",
					inputBoundIdentifier: "tile_mode",
				},
				data: {
					options: tileMode,
				},
			},
			{
				name: "scale_x",
				type: "Input",
				connectors: [],
				options: {
					label: "Scale X",
					inputBoundIdentifier: "scale_x",
				},
				data: {},
            },
            {
				name: "scale_y",
				type: "Input",
				connectors: [],
				options: {
					label: "Scale Y",
					inputBoundIdentifier: "scale_y",
				},
				data: {},
			},
			{
			name: "offset_x",
				type: "Input",
				connectors: [],
				options: {
					label: "Offset X",
					inputBoundIdentifier: "offset_x",
				},
				data: {},
			},
			{
				name: "offset_y",
				type: "Input",
				connectors: [],
				options: {
					label: "Offset Y",
					inputBoundIdentifier: "offset_y",
				},
				data: {},
			},
			{
				name: "rotation",
				type: "Input",
				connectors: [],
				options: {
					label: "Rotation",
					inputBoundIdentifier: "rotation",
				},
				data: {},
			},
			{
				name: "clamp_rotation_sampling",
				type: "Dropdown",
				connectors: [],
				options: {
					label: "Clamp Rotation Sampling",
					inputBoundIdentifier: "clamp_rotation_sampling",
				},
				data: {
					options: cornerSample,
				},
			},
		],
	};

	return definition;
}

export function setup() {
	// Create one WebGl context for this node definition
	gl = NodeShader.createGLContext();
	program = Shader.createProgram(gl, BillboardVert, BlendFrag);
	gl_tile_type = [gl.MIRROR_REPEAT, gl.REPEAT, gl.CLAMP_TO_EDGE];
}

export function compute(nodeData) {
	const foreground = nodeData.inConnections.foreground[0];
	const foregroundIdentifier = foreground?.identifier;
	const foregroundResolution = foreground?.node.propertyValues[foregroundIdentifier]?.resolution;
	const foregroundFF = foregroundResolution ? Node.formFactorFromResolution(foregroundResolution) : Node.formFactorList[0];

	// If either is a strip, both are a strip
	let ff = Node.formFactorList[0];
	if (foregroundFF === Node.formFactorList[1]) {
		ff = Node.formFactorList[1];
	}

	// Set up render data
	const resolution = Node.formFactorResolutions[ff];
	const uniforms = {
        u_scale_x: { value: Node.getInPropertyValue(nodeData, "scale_x"), type: "float", vector: false, location: null },
		u_scale_y: { value: Node.getInPropertyValue(nodeData, "scale_y"), type: "float", vector: false, location: null },
		u_offset_x: { value: Node.getInPropertyValue(nodeData, "offset_x"), type: "float", vector: false, location: null },
		u_offset_y: { value: Node.getInPropertyValue(nodeData, "offset_y"), type: "float", vector: false, location: null },
		u_rotation: { value: Node.getInPropertyValue(nodeData, "rotation"), type: "float", vector: false, location: null },
		u_foregroundExists: { value: true, type: "bool", vector: false, location: null },
		u_clamp_rotation_sampling: { value: cornerSample.indexOf(Node.getInPropertyValue(nodeData, "clamp_rotation_sampling")), type: "int", vector: false, location: null },
	};
	const textures = {
		u_foreground: { value: Node.getInPropertyValue(nodeData, "foreground"), location: null },
	};

	NodeShader.initializeProgram(gl, program, resolution, uniforms, textures);
	const framebuffer = NodeShader.renderToTexture(gl, resolution);
	const tile_mode = tileMode.indexOf(Node.getInPropertyValue(nodeData, "tile_mode"));
	NodeShader.composite(gl, uniforms, textures, gl_tile_type[tile_mode]);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);
	Node.setPropertyValue(nodeData, "composite", image);
}
