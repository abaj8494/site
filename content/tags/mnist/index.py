print(y[0])

X_train, X_test, y_train, y_test = X[:60000], X[60000:], y[:60000], y[60000:]

from sklearn.linear_model import LogisticRegression
sm_mod = LogisticRegression(multi_class='multinomial',
			      penalty='l2',
			      C=50,
			      solver='sag',
			      tol=.001,
			      max_iter=1000
			      ).fit(X_train, y_train)
from sklearn.metrics import accuracy_score
from sklearn.metrics import confusion_matrix
print(f'Train Accuracy: {accuracy_score(sm_mod.predict(X_train), y_train)}')
print(f'Test Accuracy: {accuracy_score(sm_mod.predict(X_test), y_test)}')
print("Confusion Matrix: \n"+str(confusion_matrix(y_test, sm_mod.predict(X_test))))
