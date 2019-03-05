attribute vec4 a_position;

varying vec2 v_texCoord;

void main() {
	v_texCoord = vec2(a_position.x + 1.0, a_position.y + 1.0) * 0.5;
	gl_Position = vec4(a_position.x, -a_position.y, 0, 1);
}