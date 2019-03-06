const shaderFiles = ["billboard.vert.glsl", "billboard.frag.glsl"];

const billboardShader = {
	vertex: "billboard.vert.glsl",
	fragment: "billboard.frag.glsl",
	attributes: {
		"a_position": new Float32Array([-1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1]),
	},
	uniforms: {
		"u_resolution": [1024, 1024],
		"u_scale": [10.0],
		"u_seed": [100],
	},
}

export function renderThumbnail(canvas) {
	const gl = canvas.getContext("webgl");
	load(gl);
}

function load(gl) {
	const loadingFiles = shaderFiles.map(filename => loadShader(filename));
	Promise
	.all(loadingFiles)
	.then((sources) => {
		const shaders = {};
		shaderFiles.forEach((filename, index) => {
			shaders[filename] = sources[index];
		});

		const billboardData = initShaderProgram(gl, shaders, billboardShader);
		renderLoop(gl, billboardData, billboardShader, new Date().getTime());
	});
}

function renderLoop(gl, billboardData, billboardShader, startTime) {
	resizeViewport(gl);
	clearViewport(gl);

	const deltaTime = (new Date().getTime() - startTime) / 1000;

	renderShaderProgram(gl, billboardData, billboardShader);
	// billboardShader.uniforms["u_scale"][0] = 10 + Math.sin(deltaTime);
	requestAnimationFrame(() => renderLoop(gl, billboardData, billboardShader, startTime));
}

function initShaderProgram(gl, shadersSources, shader) {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, shadersSources[shader.vertex]);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, shadersSources[shader.fragment]);

	const shaderProgramData = {
		program: linkProgram(gl, vertexShader, fragmentShader),
		buffers: {},
		attributeLocations: {},
		uniformLocations: {},
	};

	// Attributes
	Object.keys(shader.attributes).forEach((attribute) => {
		const data = shader.attributes[attribute];

		// Create and bind the buffer
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

		// Save the buffer to the returned object
		shaderProgramData.buffers[attribute] = buffer;

		// Upload the attribute data to the buffer
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

		// Look up the attribute location
		const location = gl.getAttribLocation(shaderProgramData.program, attribute);

		// Save the attribute location to the returned object
		shaderProgramData.attributeLocations[attribute] = location;
	});

	// Uniforms
	Object.keys(shader.uniforms).forEach((uniform) => {
		// Get and save all the uniform locations
		shaderProgramData.uniformLocations[uniform] = gl.getUniformLocation(shaderProgramData.program, uniform);
	});

	return shaderProgramData;
}

function resizeViewport(gl) {
	gl.canvas.width = gl.canvas.clientWidth;
	gl.canvas.height = gl.canvas.clientHeight;
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function clearViewport(gl) {
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function renderShaderProgram(gl, shaderProgramData, shader) {
	// Use the shader program
	gl.useProgram(shaderProgramData.program);

	// Attributes
	Object.keys(shaderProgramData.attributeLocations).forEach((attribute) => {
		const location = shaderProgramData.attributeLocations[attribute];
		const buffer = shaderProgramData.buffers[attribute];

		gl.enableVertexAttribArray(location);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
	});

	// Uniforms
	Object.keys(shaderProgramData.uniformLocations).forEach((uniform) => {
		const location = shaderProgramData.uniformLocations[uniform];
		const data = shader.uniforms[uniform];
		if (data.length === 1) gl.uniform1fv(location, data);
		else if (data.length === 2) gl.uniform2fv(location, data);
		else if (data.length === 3) gl.uniform3fv(location, data);
		else if (data.length === 4) gl.uniform4fv(location, data);
		else console.log("Unknown data type for the uniform being set");
	});

	// Draw!
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * Loads a shader as text from a file at a given path
 * @param {string} file Shader file name
 * @returns {string} Shader source code
 */
function loadShader(file) {
	return fetch("glsl/" + file).then(response => response.text());
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
	
	const compilationSuccess = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (compilationSuccess) return shader;

	console.log(gl.getShaderInfoLog(shader));
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

	console.log(gl.getProgramInfoLog(program));
	gl.deleteProgram(program);
}
