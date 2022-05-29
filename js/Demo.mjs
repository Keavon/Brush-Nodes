import * as NodeGraph from "/Materialism/js/NodeGraph.mjs";
import * as Node from "/Materialism/js/Node.mjs";

export default async function Demo() {
	switch (window.location.hash) {
		case "#demo1": demo1(); break;
		case "#demo2": demo2(); break;
		case "#demo3": demo3(); break;
		default: return false;
	}
	return true;
}

async function demo1() {
	const perlin1 = await NodeGraph.addNode("Perlin Noise", 50, 50);
	await Node.setFinalPropertyValueAndPropagate(perlin1, "scale", 25);

	const perlin2 = await NodeGraph.addNode("Perlin Noise", 50, 450);
	await Node.setFinalPropertyValueAndPropagate(perlin2, "seed", 10);

	const blend1 = await NodeGraph.addNode("Blend", 400, 250);
	await Node.setFinalPropertyValueAndPropagate(blend1, "mode", "Multiply");

	const output = await NodeGraph.addNode("Output", 750, 250);

	await NodeGraph.connectWire(perlin1, "pattern", blend1, "foreground");
	await NodeGraph.connectWire(perlin2, "pattern", blend1, "background");
	await NodeGraph.connectWire(blend1, "composite", output, "diffuse");
}

async function demo2() {
	const perlin1 = await NodeGraph.addNode("Perlin Noise", 50, 50);

	const perlin2 = await NodeGraph.addNode("Perlin Noise", 50, 450);
	await Node.setFinalPropertyValueAndPropagate(perlin2, "seed", 1);

	const perlin3 = await NodeGraph.addNode("Perlin Noise", 400, 450);
	await Node.setFinalPropertyValueAndPropagate(perlin3, "scale", 30);
	await Node.setFinalPropertyValueAndPropagate(perlin3, "seed", 2);

	const blend1 = await NodeGraph.addNode("Blend", 400, 50);
	await Node.setFinalPropertyValueAndPropagate(blend1, "mode", "Add (Linear Dodge)");

	const blend2 = await NodeGraph.addNode("Blend", 750, 50);
	await Node.setFinalPropertyValueAndPropagate(blend2, "opacity", 0.75);

	const output = await NodeGraph.addNode("Output", 1100, 50);

	await NodeGraph.connectWire(perlin1, "pattern", blend1, "foreground");
	await NodeGraph.connectWire(perlin2, "pattern", blend1, "background");
	await NodeGraph.connectWire(blend1, "composite", blend2, "foreground");
	await NodeGraph.connectWire(perlin3, "pattern", blend2, "background");
	await NodeGraph.connectWire(blend2, "composite", output, "diffuse");
	await NodeGraph.connectWire(blend2, "composite", output, "displacement");
}

async function demo3() {
	// Perlin Noise
	const perlin1 = await NodeGraph.addNode("Perlin Noise", -200, 0);
	await Node.setFinalPropertyValueAndPropagate(perlin1, "scale", 10);

	const perlin2 = await NodeGraph.addNode("Perlin Noise", -200, 600);
	await Node.setFinalPropertyValueAndPropagate(perlin2, "scale", 20);
	await Node.setFinalPropertyValueAndPropagate(perlin2, "seed", 1);

	const perlin3 = await NodeGraph.addNode("Perlin Noise", 200, 400);
	await Node.setFinalPropertyValueAndPropagate(perlin3, "scale", 5);
	await Node.setFinalPropertyValueAndPropagate(perlin3, "seed", 2);

	// Blend
	const blend1 = await NodeGraph.addNode("Blend", 200, 0);
	await Node.setFinalPropertyValueAndPropagate(blend1, "mode", "Multiply");

	const blend2 = await NodeGraph.addNode("Blend", 600, 0);
	await Node.setFinalPropertyValueAndPropagate(blend2, "mode", "Overlay");

	const blend3 = await NodeGraph.addNode("Blend", 1000, 400);

	const blend4 = await NodeGraph.addNode("Blend", 1400, 600);
	await Node.setFinalPropertyValueAndPropagate(blend4, "mode", "Dissolve");

	const blend5 = await NodeGraph.addNode("Blend", 1800, 400);
	await Node.setFinalPropertyValueAndPropagate(blend5, "opacity", 0.85);

	// Output
	const output = await NodeGraph.addNode("Output", 1800, 200);

	// Connections
	await NodeGraph.connectWire(perlin1, "pattern", blend1, "foreground");
	await NodeGraph.connectWire(perlin2, "pattern", blend1, "background");
	await NodeGraph.connectWire(perlin2, "pattern", blend4, "background");
	await NodeGraph.connectWire(blend1, "composite", blend2, "foreground");
	await NodeGraph.connectWire(perlin3, "pattern", blend2, "background");
	await NodeGraph.connectWire(perlin3, "pattern", blend3, "background");
	await NodeGraph.connectWire(blend2, "composite", blend3, "foreground");
	await NodeGraph.connectWire(blend3, "composite", blend4, "foreground");
	await NodeGraph.connectWire(blend4, "composite", blend5, "background");
	await NodeGraph.connectWire(blend3, "composite", blend5, "foreground");
	await NodeGraph.connectWire(blend2, "composite", output, "displacement");
	await NodeGraph.connectWire(blend5, "composite", output, "diffuse");
}
