import * as Shader from "./Shader.js";
import PassthroughVert from "./shaders/Passthrough.vert.glsl";
import PassthroughFrag from "./shaders/Passthrough.frag.glsl";

const placeholderImage = {
	pixelData: new Uint8Array([0, 0, 0, 255]),
	resolution: [1, 1],
};

// All node compute shares this single WebGL2 context so node outputs can be passed downstream
// as GL textures (zero CPU round trips). Setup-time program compilation, texture uploads, and
// framebuffer ops all happen here.
let sharedContext = null;
export function createGLContext() {
	if (!sharedContext) {
		const canvas = document.createElement("canvas");
		sharedContext = canvas.getContext("webgl2");
	}
	return sharedContext;
}

let sharedQuadVertexBuffer = null;
let sharedQuadUvBuffer = null;
function ensureSharedQuadBuffers(gl) {
	if (sharedQuadVertexBuffer) return;
	sharedQuadVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sharedQuadVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1]), gl.STATIC_DRAW);

	sharedQuadUvBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sharedQuadUvBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0]), gl.STATIC_DRAW);
}

// WARNING: This function mutates its `uniforms` and `textures` arguments
export function initializeProgram(gl, program, resolution, uniforms, textures = {}) {
	// We render to FBOs, never to the canvas itself, so the canvas size doesn't matter — only
	// the viewport needs to be set to the current render-target resolution
	gl.viewport(0, 0, resolution[0], resolution[1]);
	gl.useProgram(program);

	// Add preset uniforms
	uniforms["u_resolution"] = { value: new Int32Array(resolution), type: "int", vector: true, location: null };

	// Locate uniforms
	Object.keys(uniforms).forEach((uniformName) => {
		uniforms[uniformName].location = gl.getUniformLocation(program, uniformName);
	});
	Object.keys(textures).forEach((uniformName) => {
		textures[uniformName].location = gl.getUniformLocation(program, uniformName);
	});

	// Reuse one set of static quad buffers across every node program (previously each compute
	// allocated and leaked a fresh pair). Per-program attribute pointers still need to be set.
	ensureSharedQuadBuffers(gl);

	const vertexAttributeLocation = gl.getAttribLocation(program, "a_vertexCoordinates");
	gl.enableVertexAttribArray(vertexAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, sharedQuadVertexBuffer);
	gl.vertexAttribPointer(vertexAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	const uvAttributeLocation = gl.getAttribLocation(program, "a_uvCoordinates");
	gl.enableVertexAttribArray(uvAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, sharedQuadUvBuffer);
	gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);
}

export function renderToTexture(gl, resolution) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution[0], resolution[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	framebuffer._attachedTexture = texture;
	return framebuffer;
}

// Returns the rendered output as a GPU-resident texture (NOT pixel data). Skipping the readback
// is the central optimization — downstream nodes bind this texture directly as a sampler input.
// The caller becomes the owner of the texture and is responsible for deleting it when replaced.
export function readRenderedTexture(gl, framebuffer, resolution) {
	const texture = framebuffer._attachedTexture;
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(framebuffer);
	return { resolution, texture };
}

export function composite(gl, uniforms, textures = {}, wrap = gl.MIRRORED_REPEAT) {
	// Uniforms
	Object.keys(uniforms).forEach((uniformName) => {
		const uniform = uniforms[uniformName];
		if (!uniform.location) return;

		if (uniform.type === "float") {
			if (!uniform.vector) gl.uniform1f(uniform.location, uniform.value);
			else if (uniform.value.length === 1) gl.uniform1fv(uniform.location, uniform.value);
			else if (uniform.value.length === 2) gl.uniform2fv(uniform.location, uniform.value);
			else if (uniform.value.length === 3) gl.uniform3fv(uniform.location, uniform.value);
			else if (uniform.value.length === 4) gl.uniform4fv(uniform.location, uniform.value);
			else console.error("Unknown data type for the uniform being set");
		}
		else if (uniform.type === "int") {
			if (!uniform.vector) gl.uniform1i(uniform.location, uniform.value);
			else if (uniform.value.length === 1) gl.uniform1iv(uniform.location, uniform.value);
			else if (uniform.value.length === 2) gl.uniform2iv(uniform.location, uniform.value);
			else if (uniform.value.length === 3) gl.uniform3iv(uniform.location, uniform.value);
			else if (uniform.value.length === 4) gl.uniform4iv(uniform.location, uniform.value);
			else console.error("Unknown data type for the uniform being set");
		}
		else if (uniform.type === "matrix") {
			if (Math.sqrt(uniform.value.length) === 2) gl.uniformMatrix2fv(uniform.location, false, uniform.value);
			else if (Math.sqrt(uniform.value.length) === 3) gl.uniformMatrix3fv(uniform.location, false, uniform.value);
			else if (Math.sqrt(uniform.value.length) === 4) gl.uniformMatrix4fv(uniform.location, false, uniform.value);
			else console.error("Unknown data type for the uniform being set");
		}
		else if (uniform.type === "bool") {
			gl.uniform1i(uniform.location, uniform.value ? 1 : 0);
		}
		else console.error("Unknown data type for the uniform being set");
	});

	// Bind input textures. If the upstream value already provides a GL texture (shared context),
	// bind it directly, no CPU upload needed. Fall back to creating a transient texture for any
	// input that comes as raw pixelData (e.g., the Input node's static strips, or placeholders).
	const transientTextures = [];
	Object.keys(textures).forEach((textureName, index) => {
		const inputValue = textures[textureName].value;
		gl.uniform1i(textures[textureName].location, index);
		gl.activeTexture(gl[`TEXTURE${index}`]);

		if (inputValue && inputValue.texture) {
			gl.bindTexture(gl.TEXTURE_2D, inputValue.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
		} else {
			const image = (inputValue && inputValue.pixelData) ? inputValue : placeholderImage;
			const texture = gl.createTexture();
			transientTextures.push(texture);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.resolution[0], image.resolution[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, image.pixelData);
		}
	});

	gl.clearColor(1, 1, 1, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.drawArrays(gl.TRIANGLES, 0, 6);

	transientTextures.forEach((texture) => gl.deleteTexture(texture));
}

// Passthrough shader for reading or copying textures at arbitrary sizes

let passthroughProgram = null;
let passthroughVertexBuffer = null;
let passthroughUvBuffer = null;
let passthroughVertexLocation = null;
let passthroughUvLocation = null;
let passthroughSourceLocation = null;

function ensurePassthrough(gl) {
	if (passthroughProgram) return;

	passthroughProgram = Shader.createProgram(gl, PassthroughVert, PassthroughFrag);

	passthroughVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, passthroughVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1]), gl.STATIC_DRAW);

	passthroughUvBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, passthroughUvBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0]), gl.STATIC_DRAW);

	passthroughVertexLocation = gl.getAttribLocation(passthroughProgram, "a_vertexCoordinates");
	passthroughUvLocation = gl.getAttribLocation(passthroughProgram, "a_uvCoordinates");
	passthroughSourceLocation = gl.getUniformLocation(passthroughProgram, "u_source");
}

// Renders a source texture into the currently-bound framebuffer at the given viewport size,
// downsampling via linear filtering as needed.
function renderPassthrough(gl, sourceTexture, width, height) {
	ensurePassthrough(gl);
	gl.useProgram(passthroughProgram);
	gl.viewport(0, 0, width, height);

	gl.enableVertexAttribArray(passthroughVertexLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, passthroughVertexBuffer);
	gl.vertexAttribPointer(passthroughVertexLocation, 2, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(passthroughUvLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, passthroughUvBuffer);
	gl.vertexAttribPointer(passthroughUvLocation, 2, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
	gl.uniform1i(passthroughSourceLocation, 0);

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Reads pixel data from a source texture, optionally downsampling to a target size first.
// Use a small target (e.g., 256x256) for thumbnail-grade reads.
export function readPixelsFromTexture(gl, sourceTexture, targetWidth, targetHeight) {
	const intermediateTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, intermediateTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, targetWidth, targetHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, intermediateTexture, 0);

	renderPassthrough(gl, sourceTexture, targetWidth, targetHeight);

	const pixelData = new Uint8Array(targetWidth * targetHeight * 4);
	gl.readPixels(0, 0, targetWidth, targetHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(framebuffer);
	gl.deleteTexture(intermediateTexture);

	return pixelData;
}

// Uploads pixel data into a new GL texture and returns the handle. Useful for nodes (like the
// Input node) that hold static CPU data and want to publish it as a GPU-resident output.
export function uploadPixelDataToTexture(gl, pixelData, resolution) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution[0], resolution[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}
