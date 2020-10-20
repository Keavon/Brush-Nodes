# Overview
Materialism is a web-based prototype of a node-based procedural material generator, similar to Substance Designer. The prototype supports building and wiring up a node graph composed of two nodes: Perlin Noise and Blend. The seed and scale can be adjusted for the Perlin noise node and the opacity and blend mode (normal, dissolve, multiply, screen, add, overlay, subtract) can be set on each node. The node graph is built in the DOM with HTML and CSS, while the node compositing pipeline, preview thumbnails, and the final 2D and 3D outputs are implemented in WebGL with custom GLSL shaders for each node's compositing operations. The output node supports base color and height displacement values that can be previewed on the spinning plane.

# Usage and Demos

### [New Material: Start with a default node graph  ![Materialism startup screengrab](https://files.keavon.com/-/BarePerkyBlackbuck/capture.png)](https://keavon.github.io/Materialism/)
### [Demo 1: A simple diffuse-only material  ![Materialism demo 1 screengrab](https://files.keavon.com/-/MaleOldlaceFulmar/capture.png)](https://keavon.github.io/Materialism/#demo1)
### [Demo 2: A diffuse and displacement material  ![Materialism demo 2 screengrab](https://files.keavon.com/-/PlayfulRoastedAssassinbug/capture.png)](https://keavon.github.io/Materialism/#demo2)
### [Demo 3: A more sophisticated material  ![Materialism demo 3 screengrab](https://files.keavon.com/-/BlondDeeppinkZebratailedlizard/capture.png)](https://keavon.github.io/Materialism/#demo3)
