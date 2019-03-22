#version 300 es

in vec4 a_vertexCoordinates;
in vec3 a_normalVectors;
in vec2 a_uvCoordinates;

uniform ivec2 u_resolution;

out vec2 v_uvCoordinates;
out vec3 v_normalVectors;

void main() {
	float aspectRatio = float(u_resolution.x) / float(u_resolution.y);
	float xScale = 1.0 / aspectRatio;
	float yScale = 1.0;
	if (aspectRatio < 1.0) {
		xScale = 1.0;
		yScale = aspectRatio;
	}
	float subscale = 1.0;

	v_uvCoordinates = a_uvCoordinates;
	v_normalVectors = a_normalVectors;
	gl_Position = vec4(a_vertexCoordinates.x * xScale * subscale, a_vertexCoordinates.y * yScale * subscale, 0, 1);
}