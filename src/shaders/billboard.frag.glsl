#version 300 es

precision mediump float;

uniform sampler2D u_main;

in vec2 v_uvCoordinates;

out vec4 Color;

void main() {
	Color = texture(u_main, v_uvCoordinates);
}