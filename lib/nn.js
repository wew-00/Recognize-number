let brain = require('brain.js'),
    net = new brain.NeuralNetwork(),
    softmax = require('./softmax'),
    json = require('json!../data/mnistTrain.json');

net.fromJSON(json);

module.exports = function (input) {
    let output = net.run(input);

    return softmax(output);
}
