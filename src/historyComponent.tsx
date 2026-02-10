import {
	UserMessage,
	AssistantMessage,
	PromptElement,
	BasePromptElementProps,
	PrioritizedList,
} from '@vscode/prompt-tsx';
import { ChatContext, ChatRequestTurn, ChatResponseTurn, ChatResponseMarkdownPart } from 'vscode';

interface IHistoryMessagesProps extends BasePromptElementProps {
	history: ChatContext['history'];
}

export class HistoryMessages extends PromptElement<IHistoryMessagesProps> {
	render() {
		const history: (UserMessage | AssistantMessage)[] = [];
		for (const turn of this.props.history) {
			if (turn instanceof ChatRequestTurn) {
				history.push(<UserMessage>{turn.prompt}</UserMessage>);
			} else if (turn instanceof ChatResponseTurn) {
				history.push(
					<AssistantMessage name={turn.participant}>
						{chatResponseToMarkdown(turn)}
					</AssistantMessage>
				);
			}
		}
		return (
			<PrioritizedList priority={0} descending={false}>
				{history}
			</PrioritizedList>
		);
	}
}


function chatResponseToMarkdown(turn: ChatResponseTurn): string {
	const markdownParts: string[] = [];

	for (const part of turn.response) {
		if (part instanceof ChatResponseMarkdownPart) {
			markdownParts.push(part.value.value);
		}
	}

	return markdownParts.join('\n');
}
