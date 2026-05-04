struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f
};

struct ProjectViewMatrix {
    viewMatrix : mat4x4f,
    projectionMatrix : mat4x4f
};

@group(0) @binding(0) var<uniform> viewProjectionMatrix: ProjectViewMatrix;

@vertex
fn vertexMain( 
          @location(0) coords : vec2f
       ) -> VertexOutput {
   let eyeCoords = vec4f(coords.x, -1, coords.y, 1);
   var output : VertexOutput;
    output.position = viewProjectionMatrix.projectionMatrix * viewProjectionMatrix.viewMatrix * eyeCoords;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let textureColor = vec4f(0, 0, 1, 1);
    return textureColor;
}
