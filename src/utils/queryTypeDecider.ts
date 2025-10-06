/**
 * Determines the type of query based on the provided prompt.
 * @param prompt The user-provided query string.
 * @returns The type of query: 'recentAudioCue', 'audioCue', or 'unknown'.
 */
export function getQueryType(prompt: string): string {
    const recentAudioCueKeywords = [
        'what sound', 'what was that sound', 'recent sound', 'just played', 
        'just heard', 'what signal', 'what audio cue', 'sound that played',
        'what was that noise', 'what is that sound'
    ];

    const audioCueKeywords = [
        'audio cue', 'audio cues', 'sound', 'sound cues', 'audio signal', 
        'accessibility.signal', 'sound signal', 'audio notification', 'beep', 
        'audio feedback', 'sound notification', 'accessibility sound'
    ];

    prompt = prompt.toLowerCase();

    if (recentAudioCueKeywords.some(keyword => prompt.includes(keyword))) {
        return 'recentAudioCue';
    }

    if (audioCueKeywords.some(keyword => prompt.includes(keyword))) {
        return 'audioCue';
    }

    return 'unknown';
}