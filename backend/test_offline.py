"""Small smoke tests. Run after `pip install -r requirements.txt`: python test_offline.py."""
import asyncio
import os
from types import SimpleNamespace
from unittest.mock import patch

import httpx

from main import check_course, nebula_get, run_tool


def test_course_validation():
    assert check_course('cs', '1337') == ('CS', '1337')
    try:
        check_course('CS/../../secret', '1337')
        assert False, 'Expected invalid prefix rejection'
    except ValueError:
        pass


async def test_nebula_contract():
    def handler(request: httpx.Request):
        assert request.url.path == '/course'
        assert request.url.params['subject_prefix'] == 'CS'
        assert request.url.params['course_number'] == '1337'
        assert request.headers['x-api-key'] == 'fake-private-key'
        return httpx.Response(200, json={'status': 200, 'message': 'ok', 'data': [{'_id': 'demo', 'title': 'Example'}]})
    transport = httpx.MockTransport(handler)
    with patch.dict(os.environ, {'NEBULA_API_KEY': 'fake-private-key'}):
        async with httpx.AsyncClient(transport=transport) as client:
            result = await run_tool(client, 'find_courses', {'prefix': 'cs', 'number': '1337'})
            assert result['results'][0]['title'] == 'Example'
            assert result['source'] == 'Nebula API GET /course'


def main():
    test_course_validation()
    asyncio.run(test_nebula_contract())
    print('Offline tests passed (fake key, mocked network).')


if __name__ == '__main__':
    main()
