#version 300 es

in vec4 a_vertexCoordinates;
in vec3 a_normalVectors;
in vec2 a_uvCoordinates;

uniform ivec2 u_resolution;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform sampler2D u_displacement;
uniform int u_displacementExists;
uniform float u_displacementScale;

out vec2 v_uvCoordinates;
out vec3 v_normalVectors;

void main() {
	float aspectRatio = float(u_resolution.x) / float(u_resolution.y);
	float xScale = aspectRatio > 1.0 ? (1.0 / aspectRatio) : 1.0;
	float yScale = aspectRatio <= 1.0 ? (1.0 / aspectRatio) : 1.0;

	v_uvCoordinates = a_uvCoordinates;
	v_normalVectors = a_normalVectors;

	vec4 point = vec4(a_vertexCoordinates.xyz, 1);
	if (u_displacementExists == 1) point.y += (texture(u_displacement, v_uvCoordinates).r - 0.5) * 0.2 * u_displacementScale;
	gl_Position = u_proj * u_view * u_model * point;
}
