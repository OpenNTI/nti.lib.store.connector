import React from 'react';
import PropTypes from 'prop-types';

const REACT_KEYS = {
	childContextTypes: true,
	contextTypes: true,
	defaultProps: true,
	displayName: true,
	getDefaultProps: true,
	mixins: true,
	propTypes: true,
	type: true,
};

export default class StoreConnector extends React.Component {

	static connect (store, component, propMap, onMount) {
		const cmp = (props) => (
			<StoreConnector
				{...props}
				_store={store}
				_propMap={propMap}
				_component={component}
				_onMount={onMount}
			/>
		);

		cmp.WrappedComponent = component;

		for (let key of Object.keys(component)) {
			if (key in REACT_KEYS || cmp[key] != null) {
				continue;
			}

			Object.defineProperty(cmp, key, {
				get: () => component[key]
			});
		}

		return cmp;
	}

	static propTypes = {
		_store: PropTypes.object.isRequired,
		_component: PropTypes.any.isRequired,
		_propMap: PropTypes.object,
		_onMount: PropTypes.func,
	}

	componentWillMount () {
		const {_store: store} = this.props;
		this.subscribe(store);
	}

	componentDidMount () {
		const {_onMount: callback} = this.props;
		if (callback) {
			callback();
		}
	}

	componentWillReceiveProps (nextProps) {
		const {_store: B} = nextProps;
		const {_store: A} = this.props;
		if (A !== B) {
			this.subscribe(B);
		}
	}

	componentWillUnmount () {
		this.unmounted = true;
		if (this.unsubscribe) {
			this.unsubscribe();
		}
	}


	subscribe (store) {
		if (this.unsubscribe) {
			this.unsubscribe();
		}

		store.addChangeListener(this.onStoreChange);

		this.unsubscribe = () => (store.removeChangeListener(this.onStoreChange), delete this.unsubscribe);
	}


	onStoreChange = ({type} = {}) => {
		const {_propMap} = this.props;

		if (this.unmounted) {
			if (this.unsubscribe) {
				this.unsubscribe();
			}
			return;
		}

		if (_propMap.hasOwnProperty(type)) {
			this.forceUpdate();
		}
	}


	getPropsFromMap () {
		const {_store, _propMap = {}, ...others} = this.props;
		const keys = Object.keys(_propMap);

		const props = {...others};
		for(let privateKey of Object.keys(StoreConnector.propTypes)) {
			delete props[privateKey];
		}

		for (let key of keys) {
			if (typeof _propMap[key] === 'string') {
				props[_propMap[key]] = _store.get(key);
			} else if (typeof key === 'string' && _propMap[key] != null) {
				props[key] = _propMap[key];
			}
		}

		return props;
	}

	render () {
		const {_component: Component} = this.props;
		const props = this.getPropsFromMap();

		return (
			<Component {...props}/>
		);
	}
}
