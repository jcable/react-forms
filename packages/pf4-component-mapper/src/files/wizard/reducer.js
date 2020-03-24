const reducer = (state, { type }) => {
  switch (type) {
    case 'finishLoading':
      return {
        ...state,
        loading: false
      };
    case 'setContainer':
      return { ...state, container: document.createElement('div') };
    default:
      return state;
  }
};

export default reducer;
