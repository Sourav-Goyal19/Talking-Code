from chains.chain import generation_chain, reflection_chain, refine_chain
from langgraph.graph import MessageGraph, END
from langchain_core.messages import HumanMessage, AIMessage

GENERATE = "generate"
REFLECT = "reflect"
REFINE = "refine"

graph = MessageGraph()


def generate_node(state, config=None):
    context = config.get("configurable", {}).get("context", "") if config else ""
    conversation_history = (
        config.get("configurable", {}).get("conversation_history", "") if config else ""
    )
    return generation_chain.invoke(
        {
            "context": context,
            "question": state[0].content,
            "messages": state,
            "conversation_history": conversation_history,
        }
    )


def reflect_node(state, config=None):
    conversation_history = (
        config.get("configurable", {}).get("conversation_history", "") if config else ""
    )
    response = reflection_chain.invoke(
        {
            "messages": state,
            "question": state[0].content,
            "conversation_history": conversation_history,
        }
    )
    return [HumanMessage(content=response.content)]


def refine_node(state, config=None):
    conversation_history = (
        config.get("configurable", {}).get("conversation_history", "") if config else ""
    )
    original_response = state[-2].content
    critique = state[-1].content
    revised_response = refine_chain.invoke(
        {
            "original_response": original_response,
            "critique": critique,
            "messages": state,
            "conversation_history": conversation_history,
        }
    )
    return [AIMessage(content=revised_response.content)]


def should_continue(state):
    if "no improvement needed" in state[-1].content.lower():
        return END
    if len(state) > 2:
        return END
    return REFLECT


graph.add_node(GENERATE, generate_node)
graph.add_node(REFLECT, reflect_node)
graph.add_node(REFINE, refine_node)

graph.set_entry_point(GENERATE)
graph.add_edge(GENERATE, REFLECT)
graph.add_edge(REFLECT, REFINE)
graph.add_conditional_edges(REFINE, should_continue)

app = graph.compile()
