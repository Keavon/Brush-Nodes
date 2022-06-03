import * as Node from "@/Node.js";
import * as Shader from "@/Shader.js";
import * as NodeShader from "@/NodeShader.js";

import BillboardVert from "@/shaders/Billboard.vert.glsl";
import BlendFrag from "@/shaders/Blend.frag.glsl";

let program;
let gl;

// const blendModeList = [
// 	"Normal", "Dissolve",
// 	"Darken", "Multiply", "Color Burn", "Linear Burn", "Darker Color",
// 	"Lighten", "Screen", "Color Dodge", "Add (Linear Dodge)", "Lighter Color",
// 	"Overlay", "Soft Light", "Hard Light", "Vivid Light", "Linear Light", "Pin Light", "Hard Mix",
// 	"Difference", "Exclusion", "Subtract", "Divide",
// 	"Hue", "Saturation", "Color", "Luminosity",
// ];

const blendModeList = ["Normal", "Dissolve", "Multiply", "Screen", "Add (Linear Dodge)", "Overlay", "Subtract"];

export function getDefinition() {
	const definition = {
		name: "Blend",
		properties: [
			{
				identifier: "foreground",
				direction: "in",
				dimensions: "2d",
				type: "color",
				constraints: {},
			},
			{
				identifier: "background",
				direction: "in",
				dimensions: "2d",
				type: "color",
				constraints: {},
			},
			{
				identifier: "mode",
				direction: "in",
				dimensions: "0d",
				type: "string",
				default: "Normal",
				constraints: {},
			},
			{
				identifier: "opacity",
				direction: "in",
				dimensions: "2d",
				type: "color",
				default: 0.5,
				constraints: { min: 0, max: 1 }
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
					{ identifier: "background", direction: "in", dimensions: "2d", type: "color" },
					{ identifier: "composite", direction: "out", dimensions: "2d", type: "color" },
				],
				options: {
					outputBoundIdentifier: "composite",
				},
			},
			{ type: "Spacer" },
			{
				name: "blend_mode",
				type: "Dropdown",
				connectors: [],
				options: {
					label: "Blend Mode",
					inputBoundIdentifier: "mode",
				},
				data: {
					options: blendModeList,
				},
			},
			{
				name: "opacity_mask",
				type: "Input",
				connectors: [],
				options: {
					label: "Opacity",
					inputBoundIdentifier: "opacity",
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

	program = Shader.createProgram(gl, BillboardVert, BlendFrag);
}

export function compute(nodeData) {
	const background = nodeData.inConnections.background[0];
	const foreground = nodeData.inConnections.foreground[0];
	const backgroundIdentifier = background?.identifier;
	const foregroundIdentifier = foreground?.identifier;
	const backgroundResolution = background?.node.propertyValues[backgroundIdentifier]?.resolution;
	const foregroundResolution = foreground?.node.propertyValues[foregroundIdentifier]?.resolution;
	const backgroundFF = backgroundResolution ? Node.formFactorFromResolution(backgroundResolution) : Node.formFactorList[0];
	const foregroundFF = foregroundResolution ? Node.formFactorFromResolution(foregroundResolution) : Node.formFactorList[0];

	// If either is a strip, both are a strip
	let ff = Node.formFactorList[0];
	if (backgroundFF === Node.formFactorList[1] || foregroundFF === Node.formFactorList[1]) {
		ff = Node.formFactorList[1];
	}

	// Set up render data
	const resolution = Node.formFactorResolutions[ff];
	const uniforms = {
		u_mode: { value: blendModeList.indexOf(Node.getInPropertyValue(nodeData, "mode")), type: "int", vector: false, location: null },
		u_opacity: { value: Node.getInPropertyValue(nodeData, "opacity"), type: "float", vector: false, location: null },
		u_foregroundExists: { value: null, type: "bool", vector: false, location: null },
		u_backgroundExists: { value: null, type: "bool", vector: false, location: null },
	};
	const textures = {
		u_foreground: { value: Node.getInPropertyValue(nodeData, "foreground"), location: null },
		u_background: { value: Node.getInPropertyValue(nodeData, "background"), location: null },
	};

	// TODO: It seems these will always be true
	uniforms.u_foregroundExists.value = Boolean(textures.u_foreground);
	uniforms.u_backgroundExists.value = Boolean(textures.u_background);

	NodeShader.initializeProgram(gl, program, resolution, uniforms, textures); // TODO: Should only be called once
	const framebuffer = NodeShader.renderToTexture(gl, program, resolution, uniforms);
	NodeShader.composite(gl, program, resolution, uniforms, textures);
	const image = NodeShader.readRenderedTexture(gl, framebuffer, resolution);

	Node.setPropertyValue(nodeData, "composite", image);
}
