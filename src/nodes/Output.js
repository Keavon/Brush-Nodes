import * as Node from "../Node.js";
import * as NodeShader from "../NodeShader.js";
import * as ViewportShader from "../ViewportShader.js";

const definition = {
	name: "Output",
	properties: [
		{
			identifier: "diffuse",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "displacement",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "displacement_scale",
			direction: "in",
			dimensions: "1d",
			type: "float",
			default: 1,
			constraints: { min: -10, max: 10 }
		},
	],
	rows: [
		{ type: "Spacer" },
		{
			name: "diffuse_output",
			type: "Output",
			connectors: [
				{ identifier: "diffuse", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Color",
				outputBoundIdentifier: "diffuse",
				textureUniformName: "u_diffuse",
			},
		},
		{
			name: "displacement_output",
			type: "Output",
			connectors: [
				{ identifier: "displacement", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Displacement",
				outputBoundIdentifier: "displacement",
				textureUniformName: "u_displacement",
			},
		},
		{
			name: "displacement_scale_factor",
			type: "Input",
			options: {
				label: "Displacement Scale",
				inputBoundIdentifier: "displacement_scale",
			},
			data: {},
		},
	],
};

export function getDefinition() {
	return definition;
}

export function compute(nodeData) {
	// The viewport canvases are separate WebGL contexts, so we can't share textures with them.
	// Read the upstream texture back to a CPU buffer here (the one unavoidable full-resolution
	// readPixels per output channel) and hand it to ViewportShader as pixelData.
	const gl = NodeShader.createGLContext();

	Object.values(definition.rows).forEach((row) => {
		if (row.name === "displacement_scale_factor") {
			ViewportShader.updateDisplacementScale(row.data.inputValue);
		}

		if (!row.options || !row.options.outputBoundIdentifier) return;

		const identifier = row.options.outputBoundIdentifier;
		const image = Node.getInPropertyValue(nodeData, identifier);

		let viewportImage = image;
		if (image && image.texture && !image.pixelData) {
			const pixelData = NodeShader.readPixelsFromTexture(gl, image.texture, image.resolution[0], image.resolution[1]);
			viewportImage = { resolution: image.resolution, pixelData };
		}

		ViewportShader.updateImage(row.options.textureUniformName, viewportImage);
	});

	const inputTexture = nodeData.inConnections.diffuse[0];
	const inputDisplacement = nodeData.inConnections.displacement[0];
	const inputTextureIdentifier = inputTexture?.identifier;
	const inputTextureResolution = inputTexture?.node.propertyValues[inputTextureIdentifier]?.resolution;
	const colorFF = inputTextureResolution && Node.formFactorFromResolution(inputTextureResolution);

	const viewport3DClasses = document.querySelector(".material-viewports").classList;
	viewport3DClasses.remove("viewport-2d-only");
	viewport3DClasses.remove("viewport-3d-only");
	viewport3DClasses.remove("short");

	if (colorFF === "Square") {
		document.querySelector(".material-viewports").style.display = "";
		document.querySelector(".viewport-strip").style.display = "none";
		ViewportShader.set3DProgramMesh("Plane");
		if (!inputDisplacement) {
			viewport3DClasses.add("viewport-2d-only");
		}
	}
	else if (colorFF === "Strip") {
		document.querySelector(".material-viewports").style.display = "";
		document.querySelector(".viewport-strip").style.display = "";
		viewport3DClasses.add("viewport-3d-only");
		viewport3DClasses.add("short");
		ViewportShader.set3DProgramMesh("Stroke");
	}
	else {
		document.querySelector(".material-viewports").style.display = "none";
		document.querySelector(".viewport-strip").style.display = "none";
	}
}
