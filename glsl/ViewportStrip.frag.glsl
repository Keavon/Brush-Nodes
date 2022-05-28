#version 300 es

precision mediump float;

in vec2 v_uvCoordinates;
in vec3 v_normalVectors;

uniform sampler2D u_diffuse;
uniform int u_diffuseExists;

out vec4 Color;

void main() {
	if (u_diffuseExists == 1) Color = texture(u_diffuse, v_uvCoordinates);
	else Color = vec4(1., 1., 1., 1.);
}
