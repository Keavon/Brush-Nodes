#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform vec3 u_rgba;

in vec2 v_uvCoordinates;

out vec4 Color;

void main() {
	Color = vec4(u_rgba.rgb, 1);
}