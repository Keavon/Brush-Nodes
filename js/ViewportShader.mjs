import * as Shader from "/Materialism/js/Shader.mjs";
import * as Mat4 from "/Materialism/js/Mat4.mjs";

// Viewports
const viewport3D = {};
const viewport2D = {};
const viewportStrip = {};

// Canvases
viewport3D.canvas = document.querySelector(".viewport-3d canvas");
viewport2D.canvas = document.querySelector(".viewport-2d canvas");
viewportStrip.canvas = document.querySelector(".viewport-strip canvas");

// Programs
viewport3D.program = null;
viewport2D.program = null;
viewportStrip.program = null;

// Meshes
viewport3D.mesh = null;

// Uniforms
viewport3D.uniforms = {
	u_resolution: { value: null, type: "int", vector: true, location: null },
	u_model: { value: null, type: "matrix", location: null },
	u_view: { value: null, type: "matrix", location: null },
	u_proj: { value: null, type: "matrix", location: null },
	u_diffuseExists: { value: null, type: "bool", vector: false, location: null },
	u_displacementExists: { value: null, type: "bool", vector: false, location: null },
};
viewport2D.uniforms = {
	u_resolution: { value: null, type: "int", vector: true, location: null },
	u_diffuseExists: { value: null, type: "int", vector: false, location: null },
	u_displacementExists: { value: null, type: "int", vector: false, location: null },
};
viewportStrip.uniforms = {
	u_resolution: { value: null, type: "int", vector: true, location: null },
	u_diffuseExists: { value: null, type: "int", vector: false, location: null },
	u_displacementExists: { value: null, type: "int", vector: false, location: null },
};

// Textures
viewport3D.textures = {
	u_diffuse: { value: null, location: null },
	u_displacement: { value: null, location: null },
};
viewport2D.textures = {
	u_diffuse: { value: null, location: null },
	u_displacement: { value: null, location: null },
};
viewportStrip.textures = {
	u_diffuse: { value: null, location: null },
	u_displacement: { value: null, location: null },
};

const placeholderImage = {
	pixelData: new Uint8Array([255, 0, 255, 255]),
	resolution: [1, 1],
};

function transformModel() {
	return Mat4.identity();
}

function transformView() {
	const time = new Date().getTime() / 1000;
	const radius = 2.5;
	const height = 1;
	const eye = [Math.sin(time) * radius, height, Math.cos(time) * radius];
	let matrix = Mat4.lookAt(eye, [0, 0, 0]);
	return matrix;
}

function transformProj() {
	const resolution = viewport3D.uniforms["u_resolution"].value;
	const aspectRatio = resolution[0] / resolution[1];
	const fov = Math.PI / 180 * 45;
	return Mat4.perspective(fov, aspectRatio, 0.1, 100);
}

function loadMesh() {
	const mesh = { quad: "/Materialism/models/plane.obj" };

	return new Promise((resolve, reject) => {
		OBJ.downloadMeshes(mesh, (loadedMesh) => resolve(loadedMesh.quad));
	});
}

export function updateImage(textureUniformName, image) {
	const texture3D = viewport3D.textures[textureUniformName];
	const texture2D = viewport2D.textures[textureUniformName];
	const textureStrip = viewportStrip.textures[textureUniformName];

	const textureIndex3D = Object.keys(viewport3D.textures).indexOf(textureUniformName);
	const textureIndex2D = Object.keys(viewport2D.textures).indexOf(textureUniformName);
	const textureIndexStrip = Object.keys(viewportStrip.textures).indexOf(textureUniformName);

	texture3D.value = image;
	texture2D.value = image;
	textureStrip.value = image;

	const context3D = viewport3D.canvas.getContext("webgl2");
	const context2D = viewport2D.canvas.getContext("webgl2");
	const contextStrip = viewportStrip.canvas.getContext("webgl2");

	if (image && texture3D.location && texture3D.value) {
		viewport3D.uniforms[`${textureUniformName}Exists`].value = true;
		sendTexture(context3D, image, textureIndex3D);
	}
	else {
		viewport3D.uniforms[`${textureUniformName}Exists`].value = false;
		sendTexture(context3D, placeholderImage, textureIndex3D);
	}

	if (image && texture2D.location && texture2D.value) {
		viewport2D.uniforms[`${textureUniformName}Exists`].value = true;
		sendTexture(context2D, image, textureIndex2D);
	}
	else {
		viewport2D.uniforms[`${textureUniformName}Exists`].value = false;
		sendTexture(context2D, placeholderImage, textureIndex2D);
	}

	if (image && textureStrip.location && textureStrip.value) {
		viewportStrip.uniforms[`${textureUniformName}Exists`].value = true;
		sendTexture(contextStrip, image, textureIndexStrip);
	}
	else {
		viewportStrip.uniforms[`${textureUniformName}Exists`].value = false;
		sendTexture(contextStrip, placeholderImage, textureIndexStrip);
	}
}

function sendTexture(gl, image, index) {
	const maxTextureUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
	if (index >= maxTextureUnits) console.error("Your browser does not support this many texture units");

	// Create and bind a texture container
	const tex = gl.createTexture();
	gl.activeTexture(gl[`TEXTURE${index}`]);
	gl.bindTexture(gl.TEXTURE_2D, tex);

	// Disable mipmaps
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	// Get the dimensions and pixels
	const width = image.resolution[0];
	const height = image.resolution[1];
	const pixelData = image.pixelData;

	// Put the image in the texture container
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
}

export default function ViewportShader() {
	setupAndRender3D();
	setupAndRender2D();
	setupAndRenderStrip();
}

function setupAndRender3D() {
	setup3D().then((resolve, reject) => {
		render3D();
	});
}

function setupAndRender2D() {
	setup2D().then((resolve, reject) => {
		render2D();
	});
}

function setupAndRenderStrip() {
	setupStrip().then((resolve, reject) => {
		renderStrip();
	});
}

function setup3D() {
	const gl = viewport3D.canvas.getContext("webgl2");

	const loadingProgram = Shader.createProgram(gl, "Viewport3D.vert.glsl", "Viewport3D.frag.glsl");
	const loadingMesh = loadMesh();

	return Promise
		.all([loadingProgram, loadingMesh])
		.then((data) => {
			viewport3D.program = data[0];
			viewport3D.mesh = data[1];
			initializeProgram(gl, viewport3D.program, viewport3D.uniforms, viewport3D.textures, viewport3D.mesh);
		});
}

function setup2D() {
	const gl = viewport2D.canvas.getContext("webgl2");

	const mesh = {
		vertices: [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
		textures: [0, 0, 1, 0, 1, 1, 0, 1],
		indices: [0, 1, 2, 2, 3, 0],
		vertexNormals: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
	};

	const loadingProgram = Shader.createProgram(gl, "Viewport2D.vert.glsl", "Viewport2D.frag.glsl");
	return loadingProgram.then((data) => {
		viewport2D.program = data;
		viewport2D.mesh = mesh;
		initializeProgram(gl, viewport2D.program, viewport2D.uniforms, viewport2D.textures, mesh);
	});
}

function setupStrip() {
	const gl = viewportStrip.canvas.getContext("webgl2");

	const mesh = {
		vertices: [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
		textures: [0, 0, 1, 0, 1, 1, 0, 1],
		indices: [0, 1, 2, 2, 3, 0],
		vertexNormals: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
	};

	const loadingProgram = Shader.createProgram(gl, "ViewportStrip.vert.glsl", "ViewportStrip.frag.glsl");
	return loadingProgram.then((data) => {
		viewportStrip.program = data;
		viewportStrip.mesh = mesh;
		initializeProgram(gl, viewportStrip.program, viewportStrip.uniforms, viewportStrip.textures, mesh);
	});
}

function render3D() {
	// Get context
	const gl = viewport3D.canvas.getContext("webgl2");

	// Update uniform value data
	viewport3D.uniforms["u_resolution"].value = resizeCanvas(gl);
	viewport3D.uniforms["u_model"].value = transformModel();
	viewport3D.uniforms["u_view"].value = transformView();
	viewport3D.uniforms["u_proj"].value = transformProj();

	// Render the canvas
	draw(gl, viewport3D);

	// Run again next frame
	requestAnimationFrame(render3D);
}

function render2D() {
	// Get context
	const gl = viewport2D.canvas.getContext("webgl2");

	// Update uniform value data
	viewport2D.uniforms["u_resolution"].value = resizeCanvas(gl);

	// Render the canvas
	draw(gl, viewport2D);

	// Run again next frame
	requestAnimationFrame(render2D);
}

function renderStrip() {
	// Get context
	const gl = viewportStrip.canvas.getContext("webgl2");

	// Update uniform value data
	viewportStrip.uniforms["u_resolution"].value = resizeCanvas(gl);

	// Render the canvas
	draw(gl, viewportStrip, [1, 1, 1, 1]);

	// Run again next frame
	requestAnimationFrame(renderStrip);
}

function resizeCanvas(gl) {
	gl.canvas.width = gl.canvas.clientWidth;
	gl.canvas.height = gl.canvas.clientHeight;
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	return [gl.canvas.width, gl.canvas.height];
}

function initializeProgram(gl, program, uniforms, textures, mesh) {
	// Prepare the canvas and shader
	gl.useProgram(program);
	gl.enable(gl.DEPTH_TEST);

	// Locate uniforms
	Object.keys(uniforms).forEach((uniformName) => {
		const location = gl.getUniformLocation(program, uniformName);
		uniforms[uniformName].location = location;
	});
	Object.keys(textures).forEach((uniformName, index) => {
		// Find and set the uniform location for the texture's sampler2D uniform
		const location = gl.getUniformLocation(program, uniformName);
		textures[uniformName].location = location;

		// Set the sampler2D to use the index as the texture unit
		gl.uniform1i(location, index);

		// Send the image, either one that has been supplied earlier on and hung onto, or a placeholder if not
		const value = textures[uniformName].value;
		updateImage(uniformName, value);
	});

	// Send plane vertex coordinates
	const vertexBuffer = gl.createBuffer();
	const vertexAttributeLocation = gl.getAttribLocation(program, "a_vertexCoordinates");
	gl.enableVertexAttribArray(vertexAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
	gl.vertexAttribPointer(vertexAttributeLocation, 3, gl.FLOAT, false, 0, 0);

	// Send plane UV coordinates
	const uvBuffer = gl.createBuffer();
	const uvAttributeLocation = gl.getAttribLocation(program, "a_uvCoordinates");
	gl.enableVertexAttribArray(uvAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.textures), gl.STATIC_DRAW);
	gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	// Send plane normal vectors
	const normalBuffer = gl.createBuffer();
	const normalAttributeLocation = gl.getAttribLocation(program, "a_normalVectors");
	gl.enableVertexAttribArray(normalAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexNormals), gl.STATIC_DRAW);
	gl.vertexAttribPointer(normalAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	// Send the index buffer
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
}

function draw(gl, viewport, clearColor = [0, 0, 0, 1]) {
	const uniforms = viewport.uniforms;

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

	gl.clearColor(...clearColor);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.drawElements(gl.TRIANGLES, viewport.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
}
