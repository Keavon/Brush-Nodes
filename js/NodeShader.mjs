const placeholderImage = {
	pixelData: new Uint8Array([0, 0, 0, 255]),
	resolution: [1, 1],
};

export function createGLContext(canvas = document.createElement("canvas")) {
	const gl = canvas.getContext("webgl2");
	return gl;
}

// WARNING: This function mutates its `uniforms` and `textures` arguments
export function initializeProgram(gl, program, resolution, uniforms, textures = {}) {
	// Prepare the canvas and shader
	gl.canvas.width = resolution[0];
	gl.canvas.height = resolution[1];
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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

	// Send plane vertex coordinates
	const vertexBuffer = gl.createBuffer();
	const vertexAttributeLocation = gl.getAttribLocation(program, "a_vertexCoordinates");
	gl.enableVertexAttribArray(vertexAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1]), gl.STATIC_DRAW);
	gl.vertexAttribPointer(vertexAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	// Send plane UV coordinates
	const uvBuffer = gl.createBuffer();
	const uvAttributeLocation = gl.getAttribLocation(program, "a_uvCoordinates");
	gl.enableVertexAttribArray(uvAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0]), gl.STATIC_DRAW);
	gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);
}

export function renderToTexture(gl, program, resolution, uniforms) {
	// Render texture
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution[0], resolution[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	// Disable mipmaps
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Framebuffer object
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	// Return the texture that gets rendered to
	return framebuffer;
}

export function readRenderedTexture(gl, framebuffer, resolution) {
	const pixelData = new Uint8Array(resolution[0] * resolution[1] * 4);
	gl.readPixels(0, 0, resolution[0], resolution[1], gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

	gl.deleteFramebuffer(framebuffer);

	return { resolution, pixelData };
}

export function composite(gl, program, resolution, uniforms, textures = {}) {
	// Uniforms
	// gl.uniform2fv(uniformLocations["u_resolution"], resolution);
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

	// Textures
	Object.keys(textures).forEach((textureName, index) => {
		if (index >= gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)) console.error("Your browser does not support this many texture units");

		const texture = gl.createTexture();
		gl.uniform1i(textures[textureName].location, index);
		gl.activeTexture(gl[`TEXTURE${index}`]);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Disable mipmaps
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		const image = textures[textureName].value || placeholderImage;
		const width = image.resolution[0];
		const height = image.resolution[1];
		const pixelData = image.pixelData;

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
	});

	gl.clearColor(1, 1, 1, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}
