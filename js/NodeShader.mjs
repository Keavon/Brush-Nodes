export function createGLContext(canvas = document.createElement("canvas")) {
	const gl = canvas.getContext("webgl2");
	return gl;
}

export function createProgram(gl, vertexShaderPath, fragmentShaderPath) {
	const relativePrefix = "../glsl/";
	const vertexShaderSource = fetch(relativePrefix + vertexShaderPath).then(response => response.text());
	const fragmentShaderSource = fetch(relativePrefix + fragmentShaderPath).then(response => response.text());
	
	return Promise
		.all([vertexShaderSource, fragmentShaderSource])
		.then((sources) => {
			const vertexShader = compileShader(gl, gl.VERTEX_SHADER, sources[0]);
			const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, sources[1]);
			const program = linkProgram(gl, vertexShader, fragmentShader);
			return program;
		});
}

export function initializeProgram(gl, program, resolution, uniforms, textures = {}, textureLocations = {}) {
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
		textureLocations[uniformName] = gl.getUniformLocation(program, uniformName);
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

export function composite(gl, program, resolution, uniforms, textures = {}, textureLocations = {}) {
	// Uniforms
	// gl.uniform2fv(uniformLocations["u_resolution"], resolution);
	Object.keys(uniforms).forEach((uniformName) => {
		const uniform = uniforms[uniformName];

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
		else console.error("Unknown data type for the uniform being set");
	});

	// Textures
	Object.keys(textures).forEach((textureName, index) => {
		if (index >= gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)) console.error("The browser does not support this many texture units");
		
		const texture = gl.createTexture();
		gl.uniform1i(textureLocations[textureName], index);
		gl.activeTexture(gl[`TEXTURE${index}`]);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Disable mipmaps
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		const image = textures[textureName];
		const width = image ? image.resolution[0] : resolution[0];
		const height = image ? image.resolution[1] : resolution[1];
		const pixelData = image ? image.pixelData : new Uint8Array(width * height * 4).fill(255);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
	});

	gl.clearColor(1, 1, 1, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * Takes a shader source file string and returns its compiled result
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {WebGLRenderingContext.VERTEX_SHADER | WebGLRenderingContext.FRAGMENT_SHADER} shaderType gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} shaderSource Shader GLSL source code
 * @returns {WebGLShader} Compiled shader
 */
function compileShader(gl, shaderType, shaderSource) {
	const shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	
	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) return shader;

	const info = gl.getShaderInfoLog(shader);
	console.error("Could not compile WebGL shader:", info);
	gl.deleteShader(shader);
}

/**
 * Creates a shader program by linking the vertex and fragment shaders
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {WebGLShader} vertexShader Vertex shader for program
 * @param {WebGLShader} fragmentShader Fragment shader for program
 * @returns {WebGLProgram} A shader program consisting of the supplied vertex and fragment shaders
 */
function linkProgram(gl, vertexShader, fragmentShader) {
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	const success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (success) return program;

	const info = gl.getProgramInfoLog(program);
	console.error("Could not compile WebGL program:", info);
	gl.deleteProgram(program);
}