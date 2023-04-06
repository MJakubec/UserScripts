'use strict';

class AudioGate extends AudioWorkletProcessor
{
  silenceBlockCount;
  intensityThreshold;
  delayedChunkCount;

  silenceBlockIndex = 0;
  active = false;
  chunks = [];

  static get parameterDescriptors()
  {
    return [
      {
        name: 'silenceBlockCount',
        defaultValue: 400,
        minValue: 0,
        maxValue: 65535,
        automationRate: 'k-rate'
      },
      {
        name: 'intensityThreshold',
        defaultValue: 25,
        minValue: 0,
        maxValue: 1023,
        automationRate: 'k-rate'
      },
      {
        name: 'delayedChunkCount',
        defaultValue: 100,
        minValue: 0,
        maxValue: 65535,
        automationRate: 'k-rate'
      },
    ];
  }

  calculateAverage(data)
  {
    var sum = 0;

    for (const value of data)
    {
      if (value >= 0)
        sum += value;
      else
        sum -= value;
    }

    var average = sum / data.length;

    return average;
  }

  evaluateIntensity(intensity)
  {
    const aboveThreshold = (intensity >= this.intensityThreshold);

    const beingActive = (aboveThreshold && this.active);
    if (beingActive)
    {
      this.silenceBlockIndex = 0;
      return;
    }

    const becomingActive = (aboveThreshold && !this.active);
    if (becomingActive)
    {
      this.active = true;
      this.silenceBlockIndex = 0;
      this.port.postMessage('active');
      return;
    }

    const becomingSilent = (!aboveThreshold && this.active);
    if (becomingSilent)
    {
      this.silenceBlockIndex++;

      const achievedSilence = (this.silenceBlockIndex >= this.silenceBlockCount);
      if (achievedSilence)
      {
        this.active = false;
        this.port.postMessage('silent');
      }
    }
  }

  transferChunks(input, output)
  {
    const inputChunk = input.filter(x => true);
    this.chunks.push(inputChunk);

    const emitStoredChunk = (this.chunks.length > this.delayedChunkCount);
    if (!emitStoredChunk)
      return;

    const outputChunk = this.chunks.shift();
    
    outputChunk.forEach((value, index) => {
      output[index] = value;
    });
  }

  updateParameterValues(parameters)
  {
    this.silenceBlockCount = parameters.silenceBlockCount[0];
    this.intensityThreshold = parameters.intensityThreshold[0];
    this.delayedChunkCount = parameters.delayedChunkCount[0];
  }

  dispatchSingleTrack(inputs, outputs)
  {
    const input = inputs[0][0];
    const output = outputs[0][0]
    
    const average = this.calculateAverage(input);
    const intensity = Math.trunc(1024 * average);
    this.evaluateIntensity(intensity);
    this.transferChunks(input, output);
  }

  process(inputs, outputs, parameters)
  {
    this.updateParameterValues(parameters);
    this.dispatchSingleTrack(inputs, outputs);
    return true;
  }
}

registerProcessor('audio-gate', AudioGate);
