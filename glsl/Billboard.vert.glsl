#version 300 es

in vec4 a_vertexCoordinates;
in vec2 a_uvCoordinates;

out vec2 v_uvCoordinates;

void main() {
	v_uvCoordinates = a_uvCoordinates;
	gl_Position = vec4(a_vertexCoordinates.x, a_vertexCoordinates.y, 0, 1);
}