struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) normal: vec3f
};

struct ProjectViewMatrix {
    viewMatrix : mat4x4f,
    projectionMatrix : mat4x4f
};

const vertSamples = 16;
const dragMult = 0.2;
const time = 1.0;

@group(0) @binding(0) var<uniform> viewProjectionMatrix: ProjectViewMatrix;

fn wavedx(position: vec2f, direction: vec2f, frequency: f32, timeshift: f32) -> vec2f {
    let x = dot(direction, position) * frequency + timeshift;
    let wave = exp(sin(x) - 1.0);
    let dx = wave * cos(x);
    return vec2f(wave, -dx);
}

fn getWaves(position: vec2f) -> f32 {
    var pos = position;
    var iter = 0.0;
    var frequency = 1.0;
    var timeMultiplier = 2.0;
    var weight = 1.0;
    var sumOfWaves = 0.0;
    var sumOfWeights = 0.0;

    for(var i = 0; i < vertSamples; i++) {
        let p = vec2(sin(iter), cos(iter));
        let res = wavedx(pos, p, frequency, time * timeMultiplier);

        pos += p * res.x * weight + dragMult;
        sumOfWaves += res.x * weight;
        sumOfWeights += weight;

        weight *= 0.82;
        frequency *= 1.18;
        timeMultiplier *= 1.07;
        iter += 1232.399963;
    }
    return 4.0 * sumOfWaves / sumOfWeights;
}

fn normal(pos: vec2f, e: f32, depth: f32) -> vec3f {
    let H = getWaves(pos) * depth;
    let a = vec3f(pos.x, H, pos.y);
    let d1 = a - vec3f(pos.x - e, getWaves(pos - vec2(e, 0)) * depth, pos.y);
    let d2 = a - vec3f(pos.x, getWaves(pos + vec2(0, e)) * depth, pos.y + e);
    return normalize(cross(d1, d2));
}

@vertex
fn vertexMain( 
          @location(0) coords : vec2f
       ) -> VertexOutput {
   let eyeCoords = vec4f(coords.x, -1, coords.y, 1);
   var shift = vec4f(0.0, getWaves(coords), 0.0, 0.0);
   var output : VertexOutput;
    output.position = viewProjectionMatrix.projectionMatrix * viewProjectionMatrix.viewMatrix * (eyeCoords + shift * 0.6);
    output.normal = normal(coords, 0.001, 1.0);
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let textureColor = vec4f(normalize(input.normal), 1);
    return textureColor;
}
