#version 300 es

in vec4 a_vertexCoordinates;
in vec3 a_normalVectors;
in vec2 a_uvCoordinates;

uniform ivec2 u_resolution;
uniform sampler2D u_diffuse;

out vec2 v_uvCoordinates;
out vec3 v_normalVectors;

void main() {
	float viewportAspectRatio = float(u_resolution.x) / float(u_resolution.y);
	float xScale = 1.0 / viewportAspectRatio;
	float yScale = 1.0;
	if (viewportAspectRatio < 1.0) {
		xScale = 1.0;
		yScale = viewportAspectRatio;
	}

	ivec2 textureDimensions = textureSize(u_diffuse, 0);
	float textureAspectRatio = float(textureDimensions.y) / float(textureDimensions.x);
	float subscale = 1.0;

	v_uvCoordinates = a_uvCoordinates;
	v_normalVectors = a_normalVectors;
	gl_Position = vec4(a_vertexCoordinates.x * xScale * subscale, a_vertexCoordinates.y * yScale * subscale, 0, 1);
}
