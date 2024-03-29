export function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

	const program = linkProgram(gl, vertexShader, fragmentShader);
	return program;
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
	gl.GL_TEXTURE_WRAP_S = gl.GL_REPEAT;

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
